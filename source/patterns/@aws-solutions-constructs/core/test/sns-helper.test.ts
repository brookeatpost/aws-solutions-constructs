/**
 *  Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import { Stack } from "aws-cdk-lib";
import * as defaults from '../';
import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import '@aws-cdk/assert/jest';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import { getResourceLogicalIdFromDescription } from "../";

// --------------------------------------------------------------
// Test deployment with no properties using AWS Managed KMS Key
// --------------------------------------------------------------
test('Test deployment with no properties using AWS Managed KMS Key', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildTopic(stack, {});

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::Join": [
        "",
        [
          "arn:",
          {
            Ref: "AWS::Partition"
          },
          ":kms:",
          {
            Ref: "AWS::Region"
          },
          ":",
          {
            Ref: "AWS::AccountId"
          },
          ":alias/aws/sns"
        ]
      ]
    }
  });
});

// --------------------------------------------------------------
// Test deployment without imported encryption key
// --------------------------------------------------------------
test('Test deployment without imported encryption key', () => {
  // Stack
  const stack = new Stack();
  // Helper declaration
  defaults.buildTopic(stack, {
    topicProps: {
      topicName: "custom-topic"
    },
    enableEncryptionWithCustomerManagedKey: true
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    TopicName: "custom-topic"
  });
  // Assertion 3
  expect(stack).toHaveResource("AWS::KMS::Key", {
    EnableKeyRotation: true
  });
});

// --------------------------------------------------------------
// Test deployment w/ imported encryption key
// --------------------------------------------------------------
test('Test deployment w/ imported encryption key', () => {
  // Stack
  const stack = new Stack();
  // Generate KMS Key
  const key = defaults.buildEncryptionKey(stack);
  // Helper declaration
  defaults.buildTopic(stack, {
    topicProps: {
      topicName: "custom-topic"
    },
    enableEncryptionWithCustomerManagedKey: true,
    encryptionKey: key
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "EncryptionKey1B843E66",
        "Arn"
      ]
    },
    TopicName: "custom-topic"
  });
});

test('enableEncryptionWithCustomerManagedKey flag is ignored when encryptionKey is set', () => {
  const stack = new Stack();
  defaults.buildTopic(stack, {
    enableEncryptionWithCustomerManagedKey: false,
    encryptionKey: defaults.buildEncryptionKey(stack)
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "EncryptionKey1B843E66",
        "Arn"
      ]
    }
  });
});

test('enableEncryptionWithCustomerManagedKey flag is ignored when topicProps.masterKey is set', () => {
  const stack = new Stack();
  defaults.buildTopic(stack, {
    enableEncryptionWithCustomerManagedKey: false,
    topicProps: {
      masterKey: defaults.buildEncryptionKey(stack)
    }
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "EncryptionKey1B843E66",
        "Arn"
      ]
    }
  });
});

test('enableEncryptionWithCustomerManagedKey flag is ignored when encryptionKeyProps is set', () => {
  const stack = new Stack();
  const description = "custom description";
  defaults.buildTopic(stack, {
    enableEncryptionWithCustomerManagedKey: false,
    encryptionKeyProps: {
      description
    },
  });

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        "EncryptionKey1B843E66",
        "Arn"
      ]
    }
  });

  expect(stack).toHaveResource("AWS::KMS::Key", {
    Description: description
  });
});

test('encryptionProps are set correctly on the SNS Topic', () => {
  const stack = new Stack();
  const description = "custom description";
  defaults.buildTopic(stack, {
    encryptionKeyProps: {
      description
    }
  });

  expect(stack).toHaveResource("AWS::KMS::Key", {
    Description: description
  });
});

test('Check SNS Topic policy', () => {
  const stack = new Stack();
  defaults.buildTopic(stack, {});

  expectCDK(stack).to(haveResource("AWS::SNS::TopicPolicy", {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            "SNS:Publish",
            "SNS:RemovePermission",
            "SNS:SetTopicAttributes",
            "SNS:DeleteTopic",
            "SNS:ListSubscriptionsByTopic",
            "SNS:GetTopicAttributes",
            "SNS:Receive",
            "SNS:AddPermission",
            "SNS:Subscribe"
          ],
          Condition: {
            StringEquals: {
              "AWS:SourceOwner": {
                Ref: "AWS::AccountId"
              }
            }
          },
          Effect: "Allow",
          Principal: {
            AWS: {
              "Fn::Join": [
                "",
                [
                  "arn:",
                  {
                    Ref: "AWS::Partition"
                  },
                  ":iam::",
                  {
                    Ref: "AWS::AccountId"
                  },
                  ":root"
                ]
              ]
            }
          },
          Resource: {
            Ref: "SnsTopic2C1570A4"
          },
          Sid: "TopicOwnerOnlyAccess"
        },
        {
          Action: [
            "SNS:Publish",
            "SNS:RemovePermission",
            "SNS:SetTopicAttributes",
            "SNS:DeleteTopic",
            "SNS:ListSubscriptionsByTopic",
            "SNS:GetTopicAttributes",
            "SNS:Receive",
            "SNS:AddPermission",
            "SNS:Subscribe"
          ],
          Condition: {
            Bool: {
              "aws:SecureTransport": "false"
            }
          },
          Effect: "Deny",
          Principal: {
            AWS: "*"
          },
          Resource: {
            Ref: "SnsTopic2C1570A4"
          },
          Sid: "HttpsOnly"
        }
      ],
      Version: "2012-10-17"
    },
  }));
});

test('existing topic encrypted with CMK is not overridden by defaults', () => {
  const stack = new Stack();

  const cmk = new kms.Key(stack, 'Key', {
    description: 'new-key-description'
  });

  const topic = new sns.Topic(stack, 'Topic', {
    masterKey: cmk
  });

  defaults.buildTopic(stack, {
    existingTopicObj: topic,
    existingTopicEncryptionKey: cmk
  });

  const kmsKeyLogicalId = getResourceLogicalIdFromDescription(stack, 'AWS::KMS::Key', 'new-key-description');

  expect(stack).toHaveResource("AWS::SNS::Topic", {
    KmsMasterKeyId: {
      "Fn::GetAtt": [
        kmsKeyLogicalId,
        "Arn"
      ]
    }
  });

  // Make sure the construct did not create any other topics or keys created
  expect(stack).toCountResources('AWS::KMS::Key', 1);
  expect(stack).toCountResources('AWS::SNS::Topic', 1);
});