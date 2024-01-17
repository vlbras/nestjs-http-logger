import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { RequestContent } from "./request-content.interface";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");
  private id = 0;

  private readonly TITLE_COLOR = "\x1b[36m";
  private readonly CONTENT_COLOR = "\x1b[90m";

  private static requestContent: RequestContent = {
    params: true,
    query: true,
    body: true,
    headers: true,
    cookies: true,
    ip: true,
  };

  static excludeFromRequest(content: Partial<RequestContent>) {
    for (const key of Object.keys(content)) {
      this.requestContent[key] = !content[key];
    }
  }

  use(request: Request, response: Response, next: NextFunction) {
    this.logRequest(request);

    let responseBody: Body;
    const originalSend = response.send;
    response.send = (body: Body) => {
      responseBody = body;
      return originalSend.call(response, body);
    };

    const startTime = Date.now();
    response.on("finish", () => {
      const duration = Date.now() - startTime;
      const title = `[${this.id}] ${response.statusCode} ${request.originalUrl} ${duration}ms`;
      this.logResponse(title, responseBody, response.statusCode);
      this.id++;
    });

    next();
  }

  private logRequest(request: Request) {
    const { method, originalUrl } = request;
    const title = this.TITLE_COLOR + `[${this.id}] ${method} ${originalUrl}`;

    const content: Partial<Request> = {};
    const iterable = Object.entries(LoggerMiddleware.requestContent);
    for (const [key, value] of iterable) {
      if (value && key in request) {
        content[key] = request[key];
      }
    }

    this.logger.log(title + " " + this.CONTENT_COLOR + JSON.stringify(content));
  }

  private logResponse(title: string, response: Body, statusCode: number) {
    if (statusCode >= 400) {
      this.logger.error(title + " " + this.CONTENT_COLOR + response);
    } else {
      this.logger.log(this.TITLE_COLOR + title);
    }
  }
}
