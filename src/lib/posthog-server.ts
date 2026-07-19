import { PostHog } from "posthog-node";

type EventProperties = Record<string, boolean | number | string | undefined>;

export async function captureServerEvent(
    distinctId: string,
    event: string,
    properties?: EventProperties,
) {
    const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0,
        enableExceptionAutocapture: true,
    });

    posthog.capture({ distinctId, event, properties });
    await posthog.shutdown();
}
