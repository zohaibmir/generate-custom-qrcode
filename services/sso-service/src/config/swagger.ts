import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'QR SaaS SSO Service API',
    version: '1.0.0',
    description: 'Enterprise Single Sign-On authentication service providing SAML, OAuth 2.0/OIDC, and LDAP authentication providers',
    contact: {
      name: 'QR SaaS Platform Team',
      email: 'support@qrsaas.com',
      url: 'https://qrsaas.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3015',
      description: 'Development server'
    },
    {
      url: 'https://api.qrsaas.com/sso',
      description: 'Production server'
    }
  ],
  paths: {},
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from authentication'
      },
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Session-based authentication cookie'
      }
    },
    schemas: {
      SSOProvider: {
        type: 'object',
        required: ['name', 'type', 'organizationId', 'configuration'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique provider identifier',
            example: '550e8400-e29b-41d4-a716-446655440000'
          },
          organizationId: {
            type: 'string',
            format: 'uuid',
            description: 'Organization identifier',
            example: '550e8400-e29b-41d4-a716-446655440001'
          },
          name: {
            type: 'string',
            description: 'Provider display name',
            example: 'Company Azure AD'
          },
          type: {
            type: 'string',
            enum: ['SAML', 'OAUTH2', 'OIDC', 'LDAP', 'GOOGLE', 'MICROSOFT', 'GITHUB'],
            description: 'Authentication provider type',
            example: 'SAML'
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'TESTING'],
            description: 'Provider status',
            default: 'ACTIVE'
          },
          configuration: {
            type: 'object',
            description: 'Provider-specific configuration',
            example: {
              entryPoint: 'https://login.microsoftonline.com/tenant-id/saml2',
              issuer: 'company-azure-ad',
              cert: '-----BEGIN CERTIFICATE-----...'
            }
          },
          metadata: {
            type: 'object',
            description: 'Additional provider metadata',
            example: {
              attributeMapping: {
                email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
              }
            }
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        }
      },
      SSOUserIdentity: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Identity identifier'
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'Internal user identifier'
          },
          providerId: {
            type: 'string',
            format: 'uuid',
            description: 'SSO provider identifier'
          },
          externalId: {
            type: 'string',
            description: 'External identity identifier'
          },
          externalUsername: {
            type: 'string',
            description: 'External username'
          },
          externalEmail: {
            type: 'string',
            format: 'email',
            description: 'External email address'
          },
          externalDisplayName: {
            type: 'string',
            description: 'External display name'
          },
          attributes: {
            type: 'object',
            description: 'Additional user attributes from provider'
          },
          lastLogin: {
            type: 'string',
            format: 'date-time',
            description: 'Last login timestamp'
          },
          loginCount: {
            type: 'integer',
            description: 'Total login count',
            default: 0
          },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
            default: 'ACTIVE'
          }
        }
      },
      ConfigTemplate: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          name: {
            type: 'string',
            description: 'Template name',
            example: 'Google Workspace OAuth2'
          },
          providerType: {
            type: 'string',
            description: 'Provider type this template supports'
          },
          description: {
            type: 'string',
            description: 'Template description'
          },
          configurationTemplate: {
            type: 'object',
            description: 'Configuration template with placeholders'
          },
          metadataTemplate: {
            type: 'object',
            description: 'Metadata template'
          },
          isBuiltIn: {
            type: 'boolean',
            description: 'Whether this is a built-in template'
          }
        }
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the operation was successful'
          },
          message: {
            type: 'string',
            description: 'Human-readable message'
          },
          data: {
            type: 'object',
            description: 'Response data'
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code'
              },
              message: {
                type: 'string',
                description: 'Error message'
              },
              details: {
                type: 'object',
                description: 'Additional error details'
              }
            }
          }
        }
      },
      AuthenticationRequest: {
        type: 'object',
        properties: {
          providerId: {
            type: 'string',
            format: 'uuid',
            description: 'SSO provider identifier'
          },
          redirectUrl: {
            type: 'string',
            format: 'uri',
            description: 'URL to redirect to after authentication'
          },
          forceAuthn: {
            type: 'boolean',
            description: 'Force re-authentication',
            default: false
          },
          state: {
            type: 'string',
            description: 'State parameter for OAuth flows'
          }
        }
      },
      AuthenticationResponse: {
        type: 'object',
        properties: {
          authUrl: {
            type: 'string',
            format: 'uri',
            description: 'Authentication URL to redirect user to'
          },
          requestId: {
            type: 'string',
            description: 'Request identifier for tracking'
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            description: 'When the auth request expires'
          }
        }
      },
      HealthCheck: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
            description: 'Overall service health status'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Health check timestamp'
          },
          service: {
            type: 'string',
            description: 'Service name',
            example: 'sso-service'
          },
          version: {
            type: 'string',
            description: 'Service version',
            example: '1.0.0'
          },
          dependencies: {
            type: 'object',
            properties: {
              database: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy']
                  },
                  responseTime: {
                    type: 'number',
                    description: 'Response time in milliseconds'
                  }
                }
              },
              redis: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['healthy', 'unhealthy']
                  },
                  responseTime: {
                    type: 'number',
                    description: 'Response time in milliseconds'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    },
    {
      sessionAuth: []
    }
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'SSO authentication endpoints'
    },
    {
      name: 'Providers',
      description: 'SSO provider management'
    },
    {
      name: 'Identities',
      description: 'User identity management'
    },
    {
      name: 'Configuration',
      description: 'Service configuration and templates'
    },
    {
      name: 'Health',
      description: 'Service health and monitoring'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/index.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerDefinition };