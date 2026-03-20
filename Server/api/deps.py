from fastapi import Header


def get_current_external_user_id(
    x_user_id: str | None = Header(default=None),
) -> str:
    return x_user_id or "local-dev-user"