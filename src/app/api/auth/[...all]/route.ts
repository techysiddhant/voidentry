import getAuth from "@/lib/auth";

export async function GET(request: Request) {
    const authH = getAuth();
    return authH.handler(request);
}

export async function POST(request: Request) {
    const authH = getAuth();
    return authH.handler(request);
}
