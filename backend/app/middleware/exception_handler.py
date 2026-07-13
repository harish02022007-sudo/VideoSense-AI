import time
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from app.core.exceptions import BaseAppException
from app.schemas.common import ProblemDetails

async def global_exception_handler(request: Request, exc: Exception) -> Response:
    print(f"EXCEPTION CAPTURED: {type(exc)} (BaseAppException: {isinstance(exc, BaseAppException)})")
    # Retrieve request correlation ID
    request_id = getattr(request.state, "request_id", "N/A")
    instance_path = request.url.path

    if isinstance(exc, BaseAppException):
        # Structured custom exception
        status_code = exc.status_code
        error_details = ProblemDetails(
            type=f"/errors/{exc.error_code.value.lower().replace('_', '-')}",
            title=exc.error_code.value,
            status=status_code,
            detail=exc.message,
            instance=instance_path,
            error_code=exc.error_code.value,
            request_id=request_id
        )
    else:
        # Generic unhandled exception
        status_code = 500
        error_details = ProblemDetails(
            type="/errors/internal-error",
            title="INTERNAL_ERROR",
            status=500,
            detail="An unexpected internal server error occurred.",
            instance=instance_path,
            error_code="INTERNAL_ERROR",
            request_id=request_id
        )

    return JSONResponse(
        status_code=status_code,
        content=error_details.model_dump()
    )
