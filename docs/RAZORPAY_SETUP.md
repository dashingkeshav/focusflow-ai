# Razorpay subscription setup

FocusFlow Pro is one individual plan for students, professionals, creators,
freelancers and anyone else who wants the full toolkit. Checkout keys and webhook
verification stay on the backend; never add the key secret or webhook secret
to a `NEXT_PUBLIC_` variable.

## What must be configured before checkout works

The pricing page and checkout are already connected to the billing API. A
checkout error saying billing is not configured means the backend is missing its
Razorpay credentials or plan ID; creating a FocusFlow account alone is not
enough to enable paid checkout.

The site owner needs to:

1. Create a Razorpay account and choose **Test Mode** or **Live Mode**.
2. Create a monthly ₹399 plan in that same mode.
3. Set all four variables below in the backend host's environment settings,
   using values copied from the same Razorpay mode.
4. Configure the webhook URL and secret described below, then restart/redeploy
   the backend.

Do not send API secrets or webhook secrets in chat, commit them to Git, or add
them to frontend environment variables. Only the non-secret plan ID and public
key ID may be shared when troubleshooting; the key secret and webhook secret
must be entered directly into the backend host.

## Configure Razorpay

1. In Razorpay, create a monthly INR plan for ₹399 (amount `39900` paise,
   interval `1`, period `monthly`).
2. Copy the plan ID into `RAZORPAY_PRO_PLAN_ID` (or legacy alias `RAZORPAY_PLAN_PRO`) in the backend environment.
3. Add the Razorpay API key ID and secret as `RAZORPAY_KEY_ID` and
   `RAZORPAY_KEY_SECRET`.
4. Add a webhook pointing to `https://<your-backend-host>/api/billing/webhook`.
   Enable the subscription events `subscription.activated`,
   `subscription.charged`, `subscription.resumed`, `subscription.paused`,
   `subscription.halted`, `subscription.cancelled`, and
   `subscription.completed`.
5. Copy that webhook's secret into `RAZORPAY_WEBHOOK_SECRET`.
6. Restart the backend so the environment configuration is loaded.

Configure the variables in the environment for the running backend service,
not just a local `.env` file. Keep the API key ID, API key secret, plan ID, and
webhook secret all in the same Test or Live mode. Test Mode is recommended
first; a Live Mode checkout must not be enabled until the live plan and webhook
have also been configured and verified.

The backend checks the configured plan's currency, billing period and amount
against the displayed FocusFlow Pro price before it creates a subscription.
Subscriptions are associated with the authenticated FocusFlow account, and
the webhook signature is checked before any billing status is updated.

FocusFlow Pro access is granted only while the subscription is active. The AI
Planner, Smart Focus Mode, focus-monitoring write endpoints, AI insights,
achievements, distraction analytics and detailed report endpoint check this
entitlement on the backend. The free workspace keeps goals, tasks, basic focus
sessions, session history and its dashboard.

Use Razorpay Test Mode keys and a Test Mode plan while validating the flow.
Switch to Live Mode keys, plan and webhook only after test payments, payment
verification, webhook delivery and scheduled cancellation have all been
confirmed.

## Environment variables

```dotenv
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_PRO=
```

`RAZORPAY_PLAN_STUDENT_PRO` is still accepted as a fallback for existing
deployments. The public pricing page offers Free and FocusFlow Pro. Existing
Student Pro subscriptions remain valid; new Pro checkout requires a signed-in
account.
