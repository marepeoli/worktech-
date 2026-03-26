from app.core.security import create_access_token, create_refresh_token


def test_access_token_has_expected_claims() -> None:
    token = create_access_token(subject="admin:1", role="ADMIN")
    assert isinstance(token, str)
    assert token


def test_refresh_token_has_expected_claims() -> None:
    token = create_refresh_token(subject="user:1", role="USER")
    assert isinstance(token, str)
    assert token
