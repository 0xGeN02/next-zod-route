import { RouteHandlerBuilder } from './routeHandlerBuilder';
import type { HandlerFormData, HandlerServerErrorFn } from './types';

export function createZodRoute(params?: {
  handleServerError?: HandlerServerErrorFn;
  handleFormData?: HandlerFormData;
}) {
  return new RouteHandlerBuilder({
    handleServerError: params?.handleServerError,
    handleFormData: params?.handleFormData,
    contextType: {},
  });
}
