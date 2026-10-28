CREATE INDEX rate_limits_expiry ON rate_limits(expires);
CREATE INDEX invites_expiry ON invites(expires_at);
CREATE INDEX invites_space_expiry ON invites(space_id,expires_at);
