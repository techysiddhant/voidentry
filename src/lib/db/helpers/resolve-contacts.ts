import { and, eq, isNull, sql } from "drizzle-orm";
import { contact } from "@/db/schema";
import { isUuid } from "@/lib/utils";
import { getDb } from "@/db/client";

export interface ResolveParticipantInput {
    contactId?: string | null;
    name?: string | null;
    share: number;
}

export interface ResolvedParticipant {
    contactId: string | null;
    share: number;
    name: string;
}

export async function resolveContacts(
    db: ReturnType<typeof getDb>,
    userId: string,
    participants: ResolveParticipantInput[]
): Promise<ResolvedParticipant[]> {
    const resolved: ResolvedParticipant[] = [];

    for (const p of participants) {
        const contactIdVal = p.contactId?.trim();
        const nameVal = p.name?.trim();

        const isYou =
            (contactIdVal?.toLowerCase() === "you") ||
            (nameVal?.toLowerCase() === "you") ||
            (contactIdVal === "null") ||
            (!contactIdVal && !nameVal) ||
            (contactIdVal === undefined && nameVal === undefined);

        if (isYou) {
            resolved.push({
                contactId: null,
                share: p.share,
                name: "You",
            });
            continue;
        }

        let contactRecord = null;

        // 1. Check if contactId is UUID and lookup
        if (contactIdVal && isUuid(contactIdVal)) {
            const records = await db
                .select()
                .from(contact)
                .where(
                    and(
                        eq(contact.id, contactIdVal),
                        eq(contact.userId, userId),
                        isNull(contact.deletedAt)
                    )
                )
                .limit(1);
            if (records.length > 0) {
                contactRecord = records[0];
            }
        }

        // 2. Lookup by name if not resolved yet (case-insensitive)
        if (!contactRecord) {
            const searchName = nameVal || contactIdVal;
            if (searchName) {
                const records = await db
                    .select()
                    .from(contact)
                    .where(
                        and(
                            eq(sql`lower(${contact.name})`, searchName.toLowerCase()),
                            eq(contact.userId, userId),
                            isNull(contact.deletedAt)
                        )
                    )
                    .limit(1);

                if (records.length > 0) {
                    contactRecord = records[0];
                } else {
                    try {
                        // Create new contact
                        const [created] = await db
                            .insert(contact)
                            .values({
                                userId,
                                name: searchName,
                            })
                            .returning();
                        contactRecord = created;
                    } catch (e) {
                        // Fetch concurrently created contact
                        const existingAgain = await db
                            .select()
                            .from(contact)
                            .where(
                                and(
                                    eq(sql`lower(${contact.name})`, searchName.toLowerCase()),
                                    eq(contact.userId, userId),
                                    isNull(contact.deletedAt)
                                )
                            )
                            .limit(1);
                        if (existingAgain.length > 0) {
                            contactRecord = existingAgain[0];
                        } else {
                            throw e;
                        }
                    }
                }
            }
        }

        if (contactRecord) {
            resolved.push({
                contactId: contactRecord.id,
                share: p.share,
                name: contactRecord.name,
            });
        } else {
            resolved.push({
                contactId: null,
                share: p.share,
                name: "You",
            });
        }
    }

    return resolved;
}
