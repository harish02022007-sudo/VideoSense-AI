import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Middleware attaching and propagating X-Request-ID across all requests contexts."""
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Check if X-Request-ID already exists in headers
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())

        # Bind request_id to request state so it is accessible within handlers
        request.state.request_id = request_id
        
        # Process request
        response = await call_next(request)
        
        # Attach request_id to response headers
        response.headers["X-Request-ID"] = request_id
        return response
