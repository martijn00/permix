import type { PermissionCatalog } from '../extractor/types'
import { optionalPdpCatalog } from './catalog'

type Schema = Readonly<Record<string, unknown>>

function pathSchema(catalog: PermissionCatalog | undefined): Schema {
  if (catalog === undefined) {
    return { type: 'string', minLength: 1 }
  }

  const permissions = catalog.permissions.toSorted((left, right) =>
    left.key < right.key ? -1 : left.key > right.key ? 1 : 0
  )
  const descriptionFor = (permission: (typeof permissions)[number]) =>
    permission.description ?? permission.title
  return {
    type: 'string',
    enum: permissions.map(({ key }) => key),
    oneOf: permissions.map((permission) => ({
      const: permission.key,
      ...(descriptionFor(permission) === undefined
        ? {}
        : { description: descriptionFor(permission) }),
    })),
    'x-permission-descriptions': Object.fromEntries(
      permissions.flatMap((permission) =>
        descriptionFor(permission) === undefined
          ? []
          : [[permission.key, descriptionFor(permission)]]
      )
    ),
  }
}

function response(description: string, schema: Schema): Schema {
  return {
    description,
    content: {
      'application/json': { schema },
    },
  }
}

function postOperation(
  operationId: string,
  summary: string,
  requestSchema: Schema,
  successSchema: Schema
): Schema {
  return {
    operationId,
    summary,
    requestBody: {
      required: true,
      content: {
        'application/json': { schema: requestSchema },
      },
    },
    responses: {
      '200': response('Successful response.', successSchema),
      '400': { $ref: '#/components/responses/InvalidRequest' },
      '401': { $ref: '#/components/responses/Unauthenticated' },
      '500': { $ref: '#/components/responses/InternalError' },
    },
  }
}

/**
 * Produces a deterministic OpenAPI 3.1 document using only supplied metadata.
 */
export function createPdpOpenApiDocument(
  catalogInput?: PermissionCatalog
): Readonly<Record<string, unknown>> {
  const catalog = optionalPdpCatalog(catalogInput)
  const permissionPath = pathSchema(catalog)
  const scopeProperties = {
    mode: { type: 'string', enum: ['caller', 'service'] },
    subject: {
      type: 'string',
      minLength: 1,
      description: 'Required in service mode and forbidden in caller mode.',
    },
  }
  const scopeSchema = {
    oneOf: [
      {
        type: 'object',
        required: ['mode'],
        properties: {
          ...scopeProperties,
          mode: { const: 'caller' },
        },
        not: { required: ['subject'] },
      },
      {
        type: 'object',
        required: ['mode', 'subject'],
        properties: {
          ...scopeProperties,
          mode: { const: 'service' },
        },
      },
    ],
  }
  const checkItem = {
    type: 'object',
    required: ['path'],
    properties: {
      path: permissionPath,
      data: {},
    },
  }
  const decision = {
    oneOf: [
      {
        type: 'object',
        required: ['allowed'],
        properties: { allowed: { const: true } },
      },
      {
        type: 'object',
        required: ['allowed', 'error'],
        properties: {
          allowed: { const: false },
          error: { $ref: '#/components/schemas/ForbiddenError' },
        },
      },
    ],
  }
  const errorPayload = {
    type: 'object',
    required: ['error'],
    properties: {
      error: { $ref: '#/components/schemas/Error' },
    },
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Permix PDP API',
      version: 'v1',
    },
    paths: {
      '/v1/health': {
        get: {
          operationId: 'pdpHealth',
          summary: 'Check PDP health',
          responses: {
            '200': response('PDP is healthy.', {
              type: 'object',
              required: ['status'],
              properties: { status: { const: 'ok' } },
            }),
          },
        },
      },
      '/v1/meta': {
        get: {
          operationId: 'pdpMetadata',
          summary: 'Read PDP protocol and implementation metadata',
          responses: {
            '200': response('PDP metadata.', {
              type: 'object',
              required: ['protocolVersion', 'version', 'catalog'],
              properties: {
                protocolVersion: { const: 'v1' },
                version: { type: 'string' },
                catalog: {
                  oneOf: [
                    { type: 'null' },
                    { type: 'object', additionalProperties: true },
                  ],
                },
              },
            }),
          },
        },
      },
      '/v1/check': {
        post: postOperation(
          'pdpCheck',
          'Evaluate one permission',
          {
            allOf: [scopeSchema, checkItem],
          },
          decision
        ),
      },
      '/v1/check/batch': {
        post: postOperation(
          'pdpCheckBatch',
          'Evaluate multiple permissions independently',
          {
            allOf: [
              scopeSchema,
              {
                type: 'object',
                required: ['checks'],
                properties: {
                  checks: { type: 'array', items: checkItem },
                },
              },
            ],
          },
          {
            type: 'object',
            required: ['results'],
            properties: {
              results: {
                type: 'array',
                items: { oneOf: [decision, errorPayload] },
              },
            },
          }
        ),
      },
      '/v1/permissions': {
        post: postOperation(
          'pdpPermissions',
          'Read dehydrated permissions',
          scopeSchema,
          {
            type: 'object',
            required: ['permissions'],
            properties: {
              permissions: {
                type: 'object',
                additionalProperties: true,
              },
            },
          }
        ),
      },
    },
    components: {
      schemas: {
        Error: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: {
              type: 'string',
              enum: [
                'unauthenticated',
                'invalid-request',
                'validation-failure',
                'forbidden',
                'internal-error',
              ],
            },
            message: { type: 'string' },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: { type: 'string' },
                  path: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        ForbiddenError: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { const: 'forbidden' },
            message: { const: 'Forbidden.' },
          },
        },
      },
      responses: {
        InvalidRequest: response('Invalid request.', errorPayload),
        Unauthenticated: response('Authentication required.', errorPayload),
        InternalError: response('Internal server error.', errorPayload),
      },
    },
  }
}
