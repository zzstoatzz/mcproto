# /// script
# dependencies = ["fastapi", "uvicorn", "python-multipart", "atproto", "pydantic-settings"]
# ///
import os
from pathlib import Path
from fastapi import FastAPI, Form
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import anyio
from atproto import AsyncClient
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    bsky_handle: str = ""  # Optional for read-only operations
    bsky_password: str = ""  # Optional for read-only operations


settings = Settings()
app = FastAPI()
BASE_DIR = Path(__file__).parent

# Ensure static directory exists
static_dir = BASE_DIR / "static"
static_dir.mkdir(parents=True, exist_ok=True)

# Serve static files
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/", response_class=HTMLResponse)
async def root() -> HTMLResponse:
    content = await anyio.Path(BASE_DIR / "index.html").read_text()
    return HTMLResponse(content)


@app.post("/lookup-identity", response_class=HTMLResponse)
async def lookup_identity(handle: str = Form(...)):
    if not handle or len(handle) < 3:
        return """
        <div class="text-gray-500 text-sm">
            Keep typing to look up a profile...
        </div>
        """

    try:
        client = AsyncClient()
        await client.login(settings.bsky_handle, settings.bsky_password)
        # Try to resolve the handle to get the permanent DID
        response = await client.resolve_handle(handle)
        did = response.did
        # Get the profile using the handle (more reliable than DID for profile data)
        profile = await client.get_profile(actor=handle)

        return f"""
        <div class="bg-white rounded-lg border border-gray-200 p-4">
            <div class="flex items-center gap-4 mb-4">
                {f'<img src="{profile.avatar}" class="w-16 h-16 rounded-full">' if profile.avatar else '<div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 text-xl font-medium">{handle[0].upper()}</div>'}
                <div>
                    <h3 class="font-medium text-lg">{profile.display_name or handle}</h3>
                    <p class="text-gray-500 handle">@{handle}</p>
                    <p class="text-xs text-gray-400 mt-1">ID: {did}</p>
                </div>
            </div>
            <div class="text-sm text-gray-600 mb-4">{profile.description or ""}</div>
            <div class="flex gap-4 text-sm text-gray-600">
                <div><span class="font-medium">{profile.posts_count or 0}</span> posts</div>
                <div><span class="font-medium">{profile.followers_count or 0}</span> followers</div>
                <div><span class="font-medium">{profile.follows_count or 0}</span> following</div>
            </div>
        </div>
        """
    except Exception as e:
        if "invalid handle" in str(e).lower():
            return """
            <div class="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">
                This doesn't look like a valid Bluesky username yet. Make sure to include the full handle (e.g., jay.bsky.team)
            </div>
            """
        return f"""
        <div class="text-red-600 bg-red-50 p-3 rounded-lg text-sm">
            Sorry, we couldn't find that profile. Double check the username and try again.
            <div class="text-xs mt-1 opacity-50">{str(e)}</div>
        </div>
        """


@app.post("/get-records", response_class=HTMLResponse)
async def get_records(handle: str = Form(...), type: str = Form(...)):
    if not handle:
        return "Please enter a username first"

    try:
        client = AsyncClient()
        await client.login(settings.bsky_handle, settings.bsky_password)

        if type == "posts":
            feed_response = await client.get_author_feed(actor=handle, limit=5)
            posts = feed_response.feed

            if not posts:
                return """
                <div class="text-gray-500 text-center py-4">
                    No posts found
                </div>
                """

            html_posts = []
            for i in posts:
                post_text = (
                    i.post.record.text
                    if hasattr(i.post.record, "text")
                    else "No content"
                )
                html_posts.append(f"""
                <div class="border-b last:border-0 py-4">
                    <div class="text-sm mb-2">{post_text}</div>
                    <div class="text-xs text-gray-500">
                        {getattr(i.post, "like_count", 0)} likes · {getattr(i.post, "repost_count", 0)} reposts
                    </div>
                </div>
                """)

            return f"""
            <div class="divide-y divide-gray-100 bg-white rounded-lg border border-gray-200">
                {"".join(html_posts)}
            </div>
            """

        elif type == "follows":
            follows = await client.get_follows(actor=handle, limit=10)

            if not follows.follows:
                return """
                <div class="text-gray-500 text-center py-4">
                    No follows found
                </div>
                """

            html_follows = []
            for follow in follows.follows:
                html_follows.append(f"""
                <div class="flex items-center gap-3 py-3">
                    {f'<img src="{follow.avatar}" class="w-10 h-10 rounded-full">' if follow.avatar else f'<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-medium">{follow.handle[0].upper()}</div>'}
                    <div>
                        <div class="font-medium">{follow.display_name or follow.handle}</div>
                        <div class="text-sm text-gray-500">@{follow.handle}</div>
                    </div>
                </div>
                """)

            return f"""
            <div class="divide-y divide-gray-100 bg-white rounded-lg border border-gray-200 p-4">
                {"".join(html_follows)}
            </div>
            """

        elif type == "likes":
            # First get a recent post to show likes for
            feed_response = await client.get_author_feed(actor=handle, limit=1)
            if not feed_response.feed:
                return """
                <div class="text-gray-500 text-center py-4">
                    No posts found to show likes for
                </div>
                """

            post = feed_response.feed[0]
            likes_response = await client.get_likes(
                uri=post.post.uri, cid=post.post.cid, limit=10
            )

            if not (likes := likes_response.likes):
                return """
                <div class="text-gray-500 text-center py-4">
                    No likes found on recent posts
                </div>
                """

            html_likes = []
            for like in likes:
                html_likes.append(f"""
                <div class="flex items-center gap-3 py-3">
                    {f'<img src="{like.actor.avatar}" class="w-10 h-10 rounded-full">' if like.actor.avatar else f'<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-medium">{like.actor.handle[0].upper()}</div>'}
                    <div>
                        <div class="font-medium">{like.actor.display_name or like.actor.handle}</div>
                        <div class="text-sm text-gray-500">@{like.actor.handle}</div>
                    </div>
                </div>
                """)

            return f"""
            <div class="space-y-4">
                <div class="bg-gray-50 p-4 rounded-lg text-sm">
                    Showing likes on this post:
                    <div class="mt-2 text-gray-600">{getattr(post.post.record, "text", "No content")}</div>
                </div>
                <div class="divide-y divide-gray-100 bg-white rounded-lg border border-gray-200 p-4">
                    {"".join(html_likes)}
                </div>
            </div>
            """

    except Exception as e:
        return f"""
        <div class="text-red-600 bg-red-50 p-3 rounded-lg text-sm">
            Sorry, we couldn't load that information right now. Please try again.
            <div class="text-xs mt-1 opacity-50">{str(e)}</div>
        </div>
        """


if __name__ == "__main__":
    uvicorn.run(
        app, host="0.0.0.0", port=8000, reload=os.getenv("ENV") == "development"
    )
