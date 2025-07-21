export interface HttpRequest {
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
}

export interface HttpResponse {
  statusCode: number;
  body: any;
}

export interface IController {
  handle(request: HttpRequest): Promise<HttpResponse>;
}
