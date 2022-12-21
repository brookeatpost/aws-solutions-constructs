/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

// Imports
import { App, Stack, Duration } from "aws-cdk-lib";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import { IotToKinesisStreams, IotToKinesisStreamsProps } from "../lib";
import { generateIntegStackName } from '@aws-solutions-constructs/core';
import { StreamEncryption } from "aws-cdk-lib/aws-kinesis";

// Setup
const app = new App();
const stack = new Stack(app, generateIntegStackName(__filename));
stack.templateOptions.description = 'Integration Test for aws-iot-kinesisstreams';

// Definitions
const existingKinesisStream = new kinesis.Stream(stack, `existing-stream`, {
  shardCount: 2,
  retentionPeriod: Duration.hours(25),
  encryption: StreamEncryption.MANAGED
});

const props: IotToKinesisStreamsProps = {
  iotTopicRuleProps: {
    topicRulePayload: {
      description: "sends data to kinesis streams",
      sql: "SELECT * FROM 'solutions/constructs'",
      actions: []
    },
  },
  existingStreamObj: existingKinesisStream
};

new IotToKinesisStreams(stack, 'test-iot-kinesisstreams', props);

// Synth
app.synth();
