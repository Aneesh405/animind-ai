# AniMind production deployment

AniMind uses a Vercel frontend and a Render backend. Credentials are configured
in the hosting dashboards and must never be added to this repository.

## 1. Deploy the Render backend

1. In Render, create a **Blueprint** from `Aneesh405/animind-ai` on `main`.
2. Render reads the repository-root `render.yaml` and creates `animind-api`.
3. Enter these environment values when prompted:
   - `GEMINI_API_KEY`: the key from Google AI Studio.
   - `GEMINI_MODEL`: the model ID enabled for that key.
   - `FRONTEND_ORIGIN`: the final Vercel origin, with no path or trailing slash.
     If Vercel is not deployed yet, enter the expected origin and replace it
     after step 2.
4. Wait for `/health` to pass and copy the HTTPS `onrender.com` service URL.

The Blueprint runs `uvicorn main:app --host 0.0.0.0 --port $PORT` from the
`backend` root. `/health` never calls Gemini. Uploaded PDF bytes are processed
in memory and are not written to disk. Lesson history and extracted PDF text use
an ephemeral SQLite database and can reset on a service restart.

## 2. Deploy the Vercel frontend

1. Import `Aneesh405/animind-ai` into Vercel.
2. Select `main` as the production branch and `frontend` as the Root Directory.
3. Keep the detected **Next.js** framework and default build/output settings.
4. Add `NEXT_PUBLIC_API_URL` for **Production** with the Render HTTPS service URL
   and no trailing slash. This value is a public endpoint, not a credential.
5. Deploy and copy the stable HTTPS Vercel production origin.

## 3. Complete the connection

1. In Render, set `FRONTEND_ORIGIN` to the exact Vercel production origin.
   Multiple exact origins can be supplied as a comma-separated list.
2. Redeploy Render so the new CORS configuration is loaded.
3. If `NEXT_PUBLIC_API_URL` changed, redeploy Vercel because `NEXT_PUBLIC_*`
   values are embedded during the frontend build.
4. Verify the backend health URL and then complete a Demo and Gemini lesson from
   the public browser. Browser narration requires a user interaction.

## Environment boundary

| Host | Variable | Secret |
| --- | --- | --- |
| Render | `GEMINI_API_KEY` | Yes |
| Render | `GEMINI_MODEL` | No |
| Render | `FRONTEND_ORIGIN` | No |
| Render | `PYTHON_VERSION` | No; pinned by the Blueprint |
| Render | `ANIMIND_DB_PATH` | No; configured by the Blueprint |
| Vercel | `NEXT_PUBLIC_API_URL` | No; public backend URL |

Never configure `GEMINI_API_KEY` in Vercel or in any `NEXT_PUBLIC_*` variable.
