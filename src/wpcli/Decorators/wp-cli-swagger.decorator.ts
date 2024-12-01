import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiTags,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { WpSearchReplaceDto } from '../dtos/wp-search-replace.dto';
import { applyDecorators } from '@nestjs/common';
import { WpMaintenanceDto } from '../dtos/wp-maintenance.dto';
import { WpCacheAddDto } from '../dtos/wp-cache-add.dto';
import { WpThemeActivateDto } from '../dtos/wp-theme-activate.dto';

export function ApiWpSearchReplace() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Search and replace strings in WordPress database',
      description:
        'Performs a search-and-replace operation across the database tables.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiBody({
      description: 'Details of the search-replace operation',
      type: WpSearchReplaceDto,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully performed search-replace operation',
    }),
    ApiResponse({
      status: 400,
      description: 'Validation or execution error occurred',
    }),
  );
}

export function ApiWpMaintenance() {
  return applyDecorators(
    ApiOperation({ summary: 'Toggle WordPress maintenance mode' }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      example: '12345',
    }),
    ApiBody({
      type: WpMaintenanceDto,
      description:
        'Request body specifying the maintenance mode action (enable/disable).',
    }),
    ApiResponse({
      status: 200,
      description: 'Maintenance mode successfully updated.',
      schema: {
        example: {
          status: 'success',
          message: 'Maintenance mode has been enabled.',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input.',
      schema: {
        example: {
          statusCode: 400,
          message: ['Mode must be either "enable" or "disable".'],
          error: 'Bad Request',
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error.',
      schema: {
        example: {
          status: 'error',
          message:
            'Failed to enable maintenance mode. WP CLI returned: Error message here.',
        },
      },
    }),
  );
}
export function ApiWpGetMaintenanceStatus() {
  return applyDecorators(
    ApiOperation({ summary: 'Get maintenance status' }),
    ApiParam({ name: 'setupId', description: 'The setup ID' }),
    ApiResponse({
      status: 200,
      description: 'Current maintenance status retrieved successfully',
      schema: {
        example: {
          status: 'success',
          data: { mode: 'active' },
        },
      },
    }),
    ApiResponse({ status: 404, description: 'Setup ID not found' }),
  );
}

export function ApiWpCacheAdd() {
  return applyDecorators(
    ApiOperation({ summary: 'Add cache entry' }),
    ApiParam({ name: 'setupId', description: 'The setup ID' }),
    ApiBody({ type: WpCacheAddDto, description: 'Cache data' }),
    ApiResponse({ status: 201, description: 'Cache added successfully' }),
    ApiResponse({ status: 400, description: 'Invalid input' }),
  );
}

export function ApiWpThemeList() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'List all WordPress themes',
      description:
        'Fetches a list of installed themes for a WordPress setup. Optionally filters by search term.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiQuery({
      name: 'search',
      description: 'Search term to filter themes',
      required: false,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully fetched the theme list',
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request or invalid parameters',
    }),
  );
}
export function ApiWpThemeActivate() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Activate a theme in WordPress',
      description: 'Activates the specified theme for a WordPress setup.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiBody({
      description: 'The theme details to be activated',
      type: WpThemeActivateDto,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully activated the theme',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input or missing parameters',
    }),
  );
}
export function ApiWpThemeDelete() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Delete a theme from WordPress setup',
      description: 'Deletes a specified theme from a WordPress instance.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiQuery({
      name: 'theme',
      description: 'The theme to be deleted',
      required: true,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully deleted the theme',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input or missing parameters',
    }),
    ApiResponse({
      status: 404,
      description: 'Theme or setup ID not found',
    }),
  );
}

export function ApiWpThemeUpdate() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Update a theme in WordPress setup',
      description: 'Updates a specified theme in a WordPress instance.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiQuery({
      name: 'theme',
      description: 'The theme to be updated',
      required: true,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully updated the theme',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input or missing parameters',
    }),
    ApiResponse({
      status: 404,
      description: 'Theme or setup ID not found',
    }),
  );
}
export function ApiWpPluginList() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Retrieve a list of plugins for a WordPress setup',
      description:
        'Fetches the list of installed plugins in a specified WordPress instance.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiQuery({
      name: 'search',
      description: 'Search term for filtering plugins',
      required: false,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved the list of plugins',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input or missing parameters',
    }),
    ApiResponse({
      status: 404,
      description: 'Setup ID not found',
    }),
  );
}
export function ApiWpPluginActivate() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Activate a plugin in the specified WordPress setup',
      description:
        'Activates the specified plugin for a given WordPress instance.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiQuery({
      name: 'plugin',
      description: 'The plugin name to be activated',
      required: true,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Plugin successfully activated',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input or missing parameters',
    }),
    ApiResponse({
      status: 404,
      description: 'Setup ID or plugin not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
export function ApiWpPluginDeactivate() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Deactivate a plugin in the specified WordPress setup',
      description:
        'Deactivates the specified plugin for a given WordPress instance.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiQuery({
      name: 'plugin',
      description: 'The plugin name to be deactivated',
      required: true,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Plugin successfully deactivated',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input or missing parameters',
    }),
    ApiResponse({
      status: 404,
      description: 'Setup ID or plugin not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
export function ApiWpPluginDelete() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Delete a plugin from the specified WordPress setup',
      description:
        'Deletes the specified plugin from a given WordPress instance.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiQuery({
      name: 'plugin',
      description: 'The plugin name to be deleted',
      required: true,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Plugin successfully deleted',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input or missing parameters',
    }),
    ApiResponse({
      status: 404,
      description: 'Setup ID or plugin not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
export function ApiWpPluginUpdate() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Update a plugin in the specified WordPress setup',
      description:
        'Updates the specified plugin in a given WordPress instance.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiQuery({
      name: 'plugin',
      description: 'The plugin name to be updated',
      required: true,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Plugin successfully updated',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input or missing parameters',
    }),
    ApiResponse({
      status: 404,
      description: 'Setup ID or plugin not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
export function ApiWpUserList() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Retrieve a list of users from the WordPress setup',
      description:
        'Fetches a list of users from the specified WordPress instance.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiQuery({
      name: 'search',
      description: 'Search term to filter the users list',
      required: false,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved the list of users',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid setup ID or search query',
    }),
    ApiResponse({
      status: 404,
      description: 'Setup ID not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
export function ApiWpUserDelete() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Delete a user from the WordPress setup',
      description:
        'Deletes a user from the specified WordPress instance using the user ID.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiQuery({
      name: 'WpUserId',
      description: 'The ID of the user to be deleted',
      required: true,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully deleted the user',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid setup ID or user ID',
    }),
    ApiResponse({
      status: 404,
      description: 'User or setup ID not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
export function ApiWpUserRoleUpdate() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Update the role of a WordPress user',
      description:
        'Updates the role of a specific user in the WordPress instance.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiParam({
      name: 'WpUserId',
      description: 'The ID of the user whose role will be updated',
      required: true,
    }),
    ApiQuery({
      name: 'role',
      description: 'The new role to assign to the user',
      required: true,
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: 'User role updated successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid setup ID, user ID, or role',
    }),
    ApiResponse({
      status: 404,
      description: 'User or setup ID not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
export function ApiWpCoreVersion() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Get WordPress core version',
      description: 'Fetches the WordPress core version for a given setup.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved the WordPress core version',
      schema: {
        example: {
          status: 'success',
          data: {
            version: '5.8.2',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid setup ID provided',
    }),
    ApiResponse({
      status: 404,
      description: 'Setup ID not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
export function ApiWpCoreCheckUpdate() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Check WordPress core for updates',
      description:
        'Checks if there is an available update for the WordPress core for a given setup.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully checked for core updates',
      schema: {
        example: {
          status: 'success',
          data: {
            updateAvailable: true,
            version: '5.8.2',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid setup ID provided',
    }),
    ApiResponse({
      status: 404,
      description: 'Setup ID not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
export function ApiWpDbName() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Get WordPress database name',
      description:
        'Retrieves the name of the WordPress database for a given setup.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved the WordPress database name',
      schema: {
        example: {
          status: 'success',
          data: {
            dbName: 'wordpress_db_name',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid setup ID provided',
    }),
    ApiResponse({
      status: 404,
      description: 'Setup ID not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
export function ApiWpRoleList() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Get WordPress roles',
      description: 'Retrieves the list of roles for a given WordPress setup.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved the list of WordPress roles',
      schema: {
        example: {
          status: 'success',
          data: [
            {
              role: 'administrator',
              capabilities: ['manage_options', 'edit_posts', 'publish_posts'],
            },
            {
              role: 'editor',
              capabilities: ['edit_posts', 'publish_posts'],
            },
          ],
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid setup ID provided',
    }),
    ApiResponse({
      status: 404,
      description: 'Setup ID not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
export function ApiWpGetPhpVersion() {
  return applyDecorators(
    ApiTags('WP CLI'),
    ApiOperation({
      summary: 'Get WordPress PHP version',
      description: 'Retrieves the PHP version for a given WordPress setup.',
    }),
    ApiParam({
      name: 'setupId',
      description: 'The setup ID of the WordPress instance',
      required: true,
    }),
    ApiResponse({
      status: 200,
      description: 'Successfully retrieved the WordPress PHP version',
      schema: {
        example: {
          status: 'success',
          data: {
            php_version: '7.4.3',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid setup ID provided',
    }),
    ApiResponse({
      status: 404,
      description: 'Setup ID not found',
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
    }),
  );
}
