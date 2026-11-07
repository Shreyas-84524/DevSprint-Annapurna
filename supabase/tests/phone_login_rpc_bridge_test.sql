BEGIN;

SELECT plan(12);

SELECT ok(
  to_regprocedure('public.record_phone_login_send(text,text,text,text,text,text,text,integer,integer)') IS NOT NULL,
  'public phone login send RPC bridge exists'
);
SELECT ok(
  to_regprocedure('public.claim_phone_login_challenge(text,text,text)') IS NOT NULL,
  'public phone login claim RPC bridge exists'
);
SELECT ok(
  to_regprocedure('public.consume_phone_login_challenge(uuid)') IS NOT NULL,
  'public phone login consume RPC bridge exists'
);

SELECT ok(
  has_function_privilege('service_role', 'public.record_phone_login_send(text,text,text,text,text,text,text,integer,integer)', 'EXECUTE'),
  'service role can execute the send bridge'
);
SELECT ok(
  has_function_privilege('service_role', 'public.claim_phone_login_challenge(text,text,text)', 'EXECUTE'),
  'service role can execute the claim bridge'
);
SELECT ok(
  has_function_privilege('service_role', 'public.consume_phone_login_challenge(uuid)', 'EXECUTE'),
  'service role can execute the consume bridge'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.record_phone_login_send(text,text,text,text,text,text,text,integer,integer)', 'EXECUTE'),
  'anonymous callers cannot execute the send bridge'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.claim_phone_login_challenge(text,text,text)', 'EXECUTE'),
  'anonymous callers cannot execute the claim bridge'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.consume_phone_login_challenge(uuid)', 'EXECUTE'),
  'anonymous callers cannot execute the consume bridge'
);

SELECT ok(
  NOT has_function_privilege('authenticated', 'public.record_phone_login_send(text,text,text,text,text,text,text,integer,integer)', 'EXECUTE'),
  'authenticated callers cannot execute the send bridge directly'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.claim_phone_login_challenge(text,text,text)', 'EXECUTE'),
  'authenticated callers cannot execute the claim bridge directly'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.consume_phone_login_challenge(uuid)', 'EXECUTE'),
  'authenticated callers cannot execute the consume bridge directly'
);

SELECT * FROM finish();

ROLLBACK;
