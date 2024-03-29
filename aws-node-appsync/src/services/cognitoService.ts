import * as Cognito from '@aws-sdk/client-cognito-identity-provider';
import logger from 'utils/logger';
import { BadRequestError, AWSSDKError } from 'exceptions/index';
import _ from 'lodash';
import { AWS_REGION, AwsSdkServiceAbstract } from 'types/index';

export enum UserPoolGroupName {
  Example = 'Example',
}

export default class extends AwsSdkServiceAbstract {
  constructor(args?: { region?: AWS_REGION; userPoolId?: string }) {
    super(args);
    this._userPoolId = (args?.userPoolId || process.env.COGNITO_USER_POOL_ID) as string;
    if (_.isEmpty(this.userPoolId)) {
      throw new BadRequestError(
        `The environment variable "COGNITO_USER_POOL_ID" or argument is not set \n ${JSON.stringify(
          {
            ...(args || {}),
            ...(process.env || {}),
          },
          null,
          2
        )}`
      );
    }
    this._client = new Cognito.CognitoIdentityProviderClient({
      region: this.region,
    });
  }

  private readonly _userPoolId: string;
  private readonly _client: Cognito.CognitoIdentityProviderClient;

  private get userPoolId(): string {
    return this._userPoolId;
  }

  private get client(): Cognito.CognitoIdentityProviderClient {
    return this._client;
  }

  /**
   * Adding a user to a user group
   * @param username Username attribute of CognitoUserPool
   * @param groupName CognitoUserPoolGroupName。
   */
  public addUserToGroup = (args: { username: string; groupName: UserPoolGroupName }): Promise<Cognito.AdminAddUserToGroupCommandOutput> => {
    logger.info('cognitoService.addUserToGroup', args);
    const params: Cognito.AdminAddUserToGroupCommandInput = {
      GroupName: args.groupName,
      UserPoolId: this.userPoolId,
      Username: args.username,
    };
    const command = new Cognito.AdminAddUserToGroupCommand(params);
    try {
      return this.client.send(command);
    } catch (e) {
      const err: Error = e as Error;
      throw new AWSSDKError(
        err,
        JSON.stringify(
          {
            stack: err.stack,
            name: err.name,
            message: err.message,
          },
          null,
          2
        )
      );
    }
  };

  /**
   * Enable MFA settings
   * @param username Username attribute of CognitoUserPool
   * @param twoStepAuthentication enable/disable two-step authentication
   */
  public setUserMFAPreference = (args: { username: string; twoStepAuthentication?: boolean }): Promise<Cognito.AdminSetUserSettingsCommandOutput> => {
    logger.info('cognitoService.setUserMFAPreference', args);
    const params: Cognito.AdminSetUserSettingsCommandInput = {
      Username: args.username,
      UserPoolId: this.userPoolId,
      MFAOptions: [], // Seems to be able to disable it by updating it with empty (unofficial information).
    };
    if (args.twoStepAuthentication) {
      params.MFAOptions = [
        ...(params.MFAOptions || []),
        {
          AttributeName: 'phone_number',
          DeliveryMedium: 'SMS',
        },
      ];
    }
    const command = new Cognito.AdminSetUserSettingsCommand(params);
    try {
      return this.client.send(command);
    } catch (e) {
      const err: Error = e as Error;
      throw new AWSSDKError(
        err,
        JSON.stringify(
          {
            stack: err.stack,
            name: err.name,
            message: err.message,
          },
          null,
          2
        )
      );
    }
  };

  /**
   * Creating a user to Cognito
   * @param username Username attribute of CognitoUserPool
   * @param password Password
   * @param phoneNumber Phone number
   * @param email Email address
   */
  public createUser = (args: { username: string; password: string; phoneNumber?: string; email?: string }): Promise<Cognito.AdminCreateUserCommandOutput> => {
    logger.info('cognitoService.createUser', args);
    const params: Cognito.AdminCreateUserCommandInput = {
      UserPoolId: this.userPoolId,
      Username: args.username,
      TemporaryPassword: args.password,
    };
    if (args.phoneNumber) {
      _.assign(params, {
        UserAttributes: [
          {
            Name: 'phone_number',
            Value: args.phoneNumber,
          },
          {
            Name: 'phone_number_verified',
            Value: 'true',
          },
        ],
        MessageAction: 'SUPPRESS',
      });
    }
    if (args.email) {
      _.assign(params, {
        UserAttributes: [
          {
            Name: 'email',
            Value: args.email,
          },
          {
            Name: 'email_verified',
            Value: 'true',
          },
        ],
        MessageAction: 'SUPPRESS',
      });
    }
    const command = new Cognito.AdminCreateUserCommand(params);
    try {
      return this.client.send(command);
    } catch (e) {
      const err: Error = e as Error;
      throw new AWSSDKError(
        err,
        JSON.stringify(
          {
            stack: err.stack,
            name: err.name,
            message: err.message,
          },
          null,
          2
        )
      );
    }
  };

  /**
   * Fix user's password (force to CONFIRMED)
   * @param username Username attribute of CognitoUserPool
   * @param password password
   */
  public setAdminPassword = (args: { username: string; password: string }): Promise<Cognito.AdminSetUserPasswordCommandOutput> => {
    logger.info('cognitoService.setAdminPassword', args);
    const params: Cognito.AdminSetUserPasswordCommandInput = {
      Password: args.password,
      Username: args.username,
      UserPoolId: this.userPoolId,
      Permanent: true,
    };
    const command = new Cognito.AdminSetUserPasswordCommand(params);
    try {
      return this.client.send(command);
    } catch (e) {
      const err: Error = e as Error;
      throw new AWSSDKError(
        err,
        JSON.stringify(
          {
            stack: err.stack,
            name: err.name,
            message: err.message,
          },
          null,
          2
        )
      );
    }
  };

  /**
   * Disable a user in the Cognito user pool.
   * @param username Username attribute of CognitoUserPool
   */
  public disableCognitoUser = (args: { username: string }): Promise<Cognito.AdminDisableUserCommandOutput> => {
    logger.info('cognitoService.disableCognitoUser', args);
    const params: Cognito.AdminDisableUserCommandInput = {
      UserPoolId: this.userPoolId,
      Username: args.username,
    };
    const command = new Cognito.AdminDisableUserCommand(params);
    try {
      return this.client.send(command);
    } catch (e) {
      const err: Error = e as Error;
      throw new AWSSDKError(
        err,
        JSON.stringify(
          {
            stack: err.stack,
            name: err.name,
            message: err.message,
          },
          null,
          2
        )
      );
    }
  };

  /**
   * Deletion process of phone number of CognitoUserPool
   * @param username Username attribute of CognitoUserPool
   */
  public deleteUserPoolPhoneNumber = async (args: { username: string }): Promise<Cognito.AdminDeleteUserAttributesCommandOutput> => {
    logger.info('cognitoService.deleteUserPoolPhoneNumber', args);
    await this.setUserMFAPreference({
      username: args.username,
      twoStepAuthentication: false,
    });
    const params: Cognito.AdminDeleteUserAttributesCommandInput = {
      UserAttributeNames: ['phone_number'], // phone_number_verified is automatically changed to false and is not specified
      UserPoolId: this.userPoolId,
      Username: args.username,
    };
    const command = new Cognito.AdminDeleteUserAttributesCommand(params);
    try {
      return this.client.send(command);
    } catch (e) {
      const err: Error = e as Error;
      throw new AWSSDKError(
        err,
        JSON.stringify(
          {
            stack: err.stack,
            name: err.name,
            message: err.message,
          },
          null,
          2
        )
      );
    }
  };

  /**
   * Update phone number of CognitoUserPool
   * @param username Username attribute of CognitoUserPool
   * @param phoneNumber phone number
   */
  public updateUserPoolPhoneNumber = (args: { username: string; phoneNumber: string }): Promise<Cognito.AdminUpdateUserAttributesCommandOutput> => {
    logger.info('cognitoService.updateUserPoolPhoneNumber', args);
    const params: Cognito.AdminUpdateUserAttributesCommandInput = {
      UserAttributes: [
        {
          Name: 'phone_number',
          Value: args.phoneNumber,
        },
        {
          Name: 'phone_number_verified',
          Value: 'true',
        },
      ],
      UserPoolId: this.userPoolId,
      Username: args.username,
    };
    const command = new Cognito.AdminUpdateUserAttributesCommand(params);
    try {
      return this.client.send(command);
    } catch (e) {
      const err: Error = e as Error;
      throw new AWSSDKError(
        err,
        JSON.stringify(
          {
            stack: err.stack,
            name: err.name,
            message: err.message,
          },
          null,
          2
        )
      );
    }
  };

  /**
   * Verify if a valid user for the given Email address exists.
   * @param email email address
   */
  public isExistEmail = async (args: { email: string }): Promise<boolean> => {
    try {
      const resultByEmail: Cognito.ListUsersCommandOutput = await this.client.send(
        new Cognito.ListUsersCommand({
          UserPoolId: this.userPoolId,
          Limit: 60,
          Filter: `email = '${args.email}'`,
        })
      );
      const resultByPreferredUsername: Cognito.ListUsersCommandOutput = await this.client.send(
        new Cognito.ListUsersCommand({
          UserPoolId: this.userPoolId,
          Limit: 60,
          Filter: `preferred_username = '${args.email}'`,
        })
      );
      const res = _.chain([...(resultByEmail.Users || []), ...(resultByPreferredUsername.Users || [])])
        .compact()
        .uniqBy('Username')
        .value();
      return !_.isUndefined(_.find(res, { UserStatus: 'CONFIRMED' }));
    } catch (e) {
      const err: Error = e as Error;
      throw new AWSSDKError(
        err,
        JSON.stringify(
          {
            stack: err.stack,
            name: err.name,
            message: err.message,
          },
          null,
          2
        )
      );
    }
  };
}
