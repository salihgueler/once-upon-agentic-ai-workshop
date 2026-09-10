import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Arn,
  ArnFormat,
  Aws,
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecrAssets from "aws-cdk-lib/aws-ecr-assets";
import * as efs from "aws-cdk-lib/aws-efs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface AgentsStackProps extends StackProps {
  readonly bedrockModelId: string;
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "../..");

export class AgentsStack extends Stack {
  public constructor(scope: Construct, id: string, props: AgentsStackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "agents",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "origin",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const cluster = new ecs.Cluster(this, "Cluster", { vpc });
    const taskDefinition = new ecs.FargateTaskDefinition(this, "Task", {
      cpu: 1024,
      memoryLimitMiB: 2048,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: [
          Arn.format(
            {
              service: "bedrock",
              region: "*",
              account: "",
              resource: "foundation-model",
              resourceName: "*",
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            },
            this,
          ),
          Arn.format(
            {
              service: "bedrock",
              region: "*",
              account: Aws.ACCOUNT_ID,
              resource: "inference-profile",
              resourceName: "*",
              arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            },
            this,
          ),
        ],
      }),
    );

    const logGroup = new logs.LogGroup(this, "Logs", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const container = taskDefinition.addContainer("Agents", {
      image: ecs.ContainerImage.fromAsset(projectRoot, {
        file: "deploy/Dockerfile",
        platform: ecrAssets.Platform.LINUX_ARM64,
      }),
      logging: ecs.LogDrivers.awsLogs({
        logGroup,
        streamPrefix: "agents",
      }),
      environment: {
        MODEL_PROVIDER: "bedrock",
        BEDROCK_MODEL_ID: props.bedrockModelId,
        AWS_REGION: this.region,
        HOST: "0.0.0.0",
        CHARACTER_STORE_PATH: "/data/characters.json",
        STRANDS_LOG_LEVEL: "info",
      },
      healthCheck: {
        command: [
          "CMD-SHELL",
          "node -e \"fetch('http://127.0.0.1:8009/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))\"",
        ],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        retries: 3,
        startPeriod: Duration.seconds(30),
      },
    });
    container.addPortMappings({ containerPort: 8009 });

    const fileSystem = new efs.FileSystem(this, "CharacterStore", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      encrypted: true,
      enableAutomaticBackups: false,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const accessPoint = fileSystem.addAccessPoint("CharacterStoreAccessPoint", {
      path: "/characters",
      createAcl: { ownerGid: "1000", ownerUid: "1000", permissions: "750" },
      posixUser: { gid: "1000", uid: "1000" },
    });
    taskDefinition.addVolume({
      name: "character-store",
      efsVolumeConfiguration: {
        fileSystemId: fileSystem.fileSystemId,
        transitEncryption: "ENABLED",
        authorizationConfig: {
          accessPointId: accessPoint.accessPointId,
          iam: "ENABLED",
        },
      },
    });
    container.addMountPoints({
      sourceVolume: "character-store",
      containerPath: "/data",
      readOnly: false,
    });
    fileSystem.grantReadWrite(taskDefinition.taskRole);

    const serviceSecurityGroup = new ec2.SecurityGroup(this, "ServiceSecurityGroup", {
      vpc,
      allowAllOutbound: true,
      description: "Allows the private load balancer to reach the Game Master API.",
    });
    const service = new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [serviceSecurityGroup],
      circuitBreaker: { rollback: true },
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
    });
    fileSystem.connections.allowDefaultPortFrom(service);

    const loadBalancerSecurityGroup = new ec2.SecurityGroup(
      this,
      "LoadBalancerSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
        description: "Receives traffic only through the CloudFront VPC origin.",
      },
    );
    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, "LoadBalancer", {
      vpc,
      internetFacing: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroup: loadBalancerSecurityGroup,
    });
    const listener = loadBalancer.addListener("HttpListener", {
      port: 80,
      open: false,
    });
    listener.addTargets("AgentsTarget", {
      port: 8009,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      deregistrationDelay: Duration.seconds(30),
      healthCheck: {
        path: "/health",
        healthyHttpCodes: "200",
        interval: Duration.seconds(30),
        timeout: Duration.seconds(10),
      },
    });
    service.connections.allowFrom(
      loadBalancer,
      ec2.Port.tcp(8009),
      "Game Master traffic from the private load balancer",
    );

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.VpcOrigin.withApplicationLoadBalancer(loadBalancer),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    new CfnOutput(this, "AgentsUrl", {
      description: "HTTPS endpoint for the Game Master API (the frontend remains local).",
      value: `https://${distribution.distributionDomainName}`,
    });
    new CfnOutput(this, "LogGroupName", {
      description: "CloudWatch Logs group for all four agent processes.",
      value: logGroup.logGroupName,
    });
  }
}
