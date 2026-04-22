import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

/**
 * Global filter — converts all errors to RFC 7807 Problem Details.
 * Production responses NEVER include stack traces.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestId = req.id ?? req.headers?.['x-request-id'];

    let title = 'Internal Server Error';
    let detail: string | undefined;
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        title = resp;
      } else if (resp && typeof resp === 'object') {
        const obj = resp as Record<string, unknown>;
        title = (obj.error as string) ?? (obj.message as string) ?? title;
        detail = Array.isArray(obj.message)
          ? (obj.message as string[]).join('; ')
          : (obj.message as string | undefined);
      }
    } else if (exception instanceof Error) {
      // Log the true error; never send it to the client in prod.
      this.logger.error({ err: exception, requestId }, 'unhandled_exception');
      if (process.env.NODE_ENV !== 'production') {
        detail = exception.message;
      }
    }

    res.status(status).send({
      type: 'about:blank',
      title,
      status,
      detail,
      instance: req.url,
      requestId,
    });
  }
}
