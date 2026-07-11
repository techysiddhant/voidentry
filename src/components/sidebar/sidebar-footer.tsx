"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import toast from "react-hot-toast";

function getInitials(name: string): string {
    return name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
}

export function NavUser() {
    const { isMobile } = useSidebar();
    const { data: session } = authClient.useSession();
    const router = useRouter();
    const [isSigningOut, setIsSigningOut] = useState(false);

    const user = session?.user;
    const name = user?.name ?? "User";
    const email = user?.email ?? "";
    const image = user?.image ?? "";
    const initials = getInitials(name);

    const handleSignOut = async () => {
        try {
            setIsSigningOut(true);
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        toast.success("Signed out.");
                        router.replace("/auth?mode=signin");
                    },
                    onError: (ctx) => {
                        toast.error(ctx.error.message ?? "Failed to sign out.");
                        setIsSigningOut(false);
                    },
                },
            });
        } catch {
            toast.error("An error occurred during sign out.");
            setIsSigningOut(false);
        }
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-secondary data-[state=open]:text-ink hover:bg-secondary rounded-none px-4 py-3 h-auto"
                        >
                            {/* Avatar */}
                            <Avatar className="h-8 w-8 rounded-none brutal-border">
                                <AvatarImage src={image} alt={name} />
                                <AvatarFallback className="rounded-none bg-ink text-paper font-mono text-xs font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            {/* Name + email */}
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-mono text-[11px] font-bold uppercase tracking-widest text-ink">
                                    {name}
                                </span>
                                <span className="truncate font-mono text-[10px] text-mute">
                                    {email}
                                </span>
                            </div>

                            <ChevronsUpDown className="ml-auto size-4 text-mute" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-none brutal-border brutal-shadow-sm bg-paper"
                        side={isMobile ? "bottom" : "top"}
                        align="end"
                        sideOffset={4}
                    >
                        {/* User info label */}
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-ink">
                                <Avatar className="h-8 w-8 rounded-none brutal-border">
                                    <AvatarImage src={image} alt={name} />
                                    <AvatarFallback className="rounded-none bg-ink text-paper font-mono text-xs font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-mono text-[11px] font-bold uppercase tracking-widest text-ink">
                                        {name}
                                    </span>
                                    <span className="truncate font-mono text-[10px] text-mute">
                                        {email}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator className="bg-ink/10" />

                        {/* Sign out */}
                        <DropdownMenuItem
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className="gap-2 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-ink cursor-pointer hover:bg-secondary focus:bg-secondary rounded-none"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            {isSigningOut ? "Signing out..." : "Sign out"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}