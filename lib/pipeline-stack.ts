import * as cdk from "aws-cdk-lib";
import { SecretValue } from "aws-cdk-lib";
import {
  BuildSpec,
  LinuxArmBuildImage,
  LinuxBuildImage,
  PipelineProject,
} from "aws-cdk-lib/aws-codebuild";
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import {
  CloudFormationCreateUpdateStackAction,
  CodeBuildAction,
  GitHubSourceAction,
} from "aws-cdk-lib/aws-codepipeline-actions";
import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const pipeline = new Pipeline(this, "Pipeline", {
      pipelineName: "Pipeline",
      crossAccountKeys: false,
    });

    const cdkSourceOutput = new Artifact("CdkSourceOutput");
    const serviceSourceOutput = new Artifact("serviceSourceOutput");

    pipeline.addStage({
      stageName: "cdkSource",
      actions: [
        new GitHubSourceAction({
          owner: "jithintill",
          repo: "aws-pipeline",
          branch: "main",
          actionName: "Pipeline_Source",
          oauthToken: SecretValue.secretsManager("cdk-test-github-token"),
          output: cdkSourceOutput,
        }),
        new GitHubSourceAction({
          owner: "jithintill",
          repo: "express-lambda",
          branch: "master",
          actionName: "Service_Source",
          oauthToken: SecretValue.secretsManager("cdk-test-github-token"),
          output: serviceSourceOutput,
        }),
      ],
    });

    const cdkBuildOutput = new Artifact("CdkBuildOutput");

    pipeline.addStage({
      stageName: "Build",
      actions: [
        new CodeBuildAction({
          actionName: "CDK_Build",
          input: cdkSourceOutput,
          outputs: [cdkBuildOutput],
          project: new PipelineProject(this, "CdkbuildProject", {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: BuildSpec.fromSourceFilename(
              "build-specs/cdk-build-spec.yml"
            ),
          }),
        }),
      ],
    });

    /*     pipeline.addStage({
      stageName: 'Pipeline_Update',
      actions:[
        new CloudFormationCreateUpdateStackAction({
          actionName: 'Pipeline_Update',
          stackName: "PipelineStack",
          templatePath: cdkBuildOutput.atPath('PipelineStack.template.json'),
          adminPermissions: true,
        }),
      ]
    }) */
  }
}
