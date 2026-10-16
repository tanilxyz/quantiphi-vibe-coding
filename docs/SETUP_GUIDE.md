# Vibe — Complete Setup Guide (VS Code + OpenAI + MongoDB Atlas)

This guide takes the project from a fresh download to a locally running chatbot and a public GitHub repository.

> **Security first:** the API key previously supplied in `api.txt` has been exposed in an uploaded file/chat context. Revoke that key and generate a replacement before running the app. Do not put keys in source code, screenshots, README files, Git commits, or the ZIP you submit. The app reads `OPENAI_API_KEY` from `.env.local`, which is ignored by Git.

## 0. What you need

- **VS Code**: <https://code.visualstudio.com/>
- **Node.js 22 LTS** (Next.js currently requires Node.js 20.9 or newer): <https://nodejs.org/>
- **Git**: <https://git-scm.com/downloads>
- **OpenAI API account/key**: <https://platform.openai.com/api-keys>
- **MongoDB Atlas account**: <https://www.mongodb.com/cloud/atlas/register>

After installing Node and Git, close and reopen VS Code. In the VS Code terminal, verify:

```bash
node --version
npm --version
git --version
```

Use Node 20.9+; Node 22 LTS is a good choice. The OpenAI API is billed separately from a ChatGPT subscription. Check your API billing/usage settings before testing: <https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform>.

## 1. Download and open the project

1. Download and extract `vibe-chat-assistant-starter.zip`.
2. In VS Code, choose **File → Open Folder** and select the extracted `vibe-chat-assistant` folder (the folder containing `package.json`).
3. Open **Terminal → New Terminal**.
4. Install dependencies:

```bash
npm install
```

Wait for npm to finish successfully. It should create `node_modules/` and `package-lock.json`. If it fails, read the last error line before retrying; see the troubleshooting section below.

## 2. Create a MongoDB Atlas database

MongoDB Atlas hosts the database in the cloud, so you do not need to install MongoDB Server locally. The free M0 deployment is suitable for a small development/demo project, subject to Atlas's current limits.

### 2.1 Create an Atlas project and free cluster

1. Open <https://cloud.mongodb.com/> and sign in or create an account.
2. Create an **Organization** if Atlas asks for one.
3. Create a **Project** named `Vibe Chat Assistant` (or choose an existing project).
4. From the project overview, choose **Create** / **Build a Database**.
5. Select the **M0 Free** deployment option, if it is available for the project.
6. Choose an available cloud provider and a region geographically close to you. Choose a cluster name such as `vibe-cluster`.
7. Click **Create Deployment** and wait until the deployment is ready.

Atlas can change button labels as its interface evolves. Official reference: <https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/>.

### 2.2 Create a database user (not your Atlas login)

The **database user** is what your application uses to log into MongoDB. It is separate from the email/password you use to sign in to Atlas.

1. In Atlas, open **Security → Database Access** (or the database access section in the setup wizard).
2. Choose **Add New Database User**.
3. Select password authentication.
4. Create a username, for example `vibe_app_user`.
5. Generate a strong password and save it in a password manager. For a beginner setup, use a generated password made of letters and numbers to avoid connection-string escaping problems with characters such as `@`, `:`, `/`, `?`, or `#`.
6. Grant only the access the app needs. Prefer a **read/write** role scoped to the `vibe_chat` database if the UI provides database-specific privileges. Avoid granting Atlas project-owner/admin privileges to the app user.
7. Save/create the user.

Do not put the database password in source code. You will use it only within the Atlas connection string in `.env.local`.

### 2.3 Allow your current IP address

Atlas blocks connections from IP addresses that are not in the project's IP access list.

1. Open **Security → Network Access** / **IP Access List**.
2. Select **Add IP Address**.
3. Choose **Add My Current IP Address**.
4. Add a description such as `VS Code local development` and confirm.
5. Wait for the entry to become active.

Avoid `0.0.0.0/0` (allow access from anywhere) for normal use. If your home/college network changes IPs, you may need to add the new current IP later.

Official reference: <https://www.mongodb.com/docs/atlas/security/quick-start/>.

### 2.4 Copy the connection string

1. Return to **Database / Clusters**.
2. Click **Connect** for `vibe-cluster`.
3. Select **Drivers** (sometimes labelled **Connect your application**).
4. Choose **Node.js** as the driver and the suggested version.
5. Copy the URI. It usually resembles:

```text
mongodb+srv://vibe_app_user:<db_password>@vibe-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

6. Replace `<db_password>` with the database user's password. Keep the rest of the URI intact. Do not include angle brackets around the real password.
7. If you chose a password with reserved URL characters, percent-encode those characters before using it in the URI. It is simpler to use a generated letters-and-numbers password for this project.

You do **not** need to manually create a database or collection in Atlas first. Once the application writes its first conversation to the `vibe_chat` database, MongoDB creates the database and the `conversations` collection automatically.

Official references: <https://www.mongodb.com/docs/atlas/driver-connection/> and <https://www.mongodb.com/docs/drivers/node/current/get-started/>.

## 3. Create or rotate your OpenAI API key

1. Open <https://platform.openai.com/api-keys>.
2. Revoke/delete the exposed key that was supplied in `api.txt`.
3. Create a new secret API key in the correct API project.
4. Copy the key when it is shown and store it securely. Do not share it or commit it to GitHub.
5. Check API usage/billing and confirm that your account/project can make API requests. API billing is separate from ChatGPT plan billing.

The app makes model calls from the **server**, not the browser. That is why the variable is named `OPENAI_API_KEY`, not `NEXT_PUBLIC_OPENAI_API_KEY`.

## 4. Configure `.env.local`

In VS Code, make a copy of `.env.example` named `.env.local`.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env.local
```

**macOS/Linux terminal:**

```bash
cp .env.example .env.local
```

Open `.env.local` and set the values. Use your newly generated OpenAI key and the Atlas URI copied above:

```dotenv
OPENAI_API_KEY=YOUR_NEW_OPENAI_API_KEY
OPENAI_MODEL=gpt-4.1-mini
MONGODB_URI=mongodb+srv://vibe_app_user:YOUR_DB_PASSWORD@YOUR_CLUSTER_HOST/?retryWrites=true&w=majority
MONGODB_DB=vibe_chat
```

Important:

- Replace each placeholder with a real value; do not keep `YOUR_...` text.
- Keep each variable on its own line.
- Do not put spaces around `=`.
- Do not add the key to React components or files under `app/` that are client components.
- `.env.local` is excluded by `.gitignore`. Never change that rule to commit your key.
- If you change environment values while the server is running, stop it with `Ctrl+C` and run `npm run dev` again.
- If your OpenAI API project does not have access to `gpt-4.1-mini`, change `OPENAI_MODEL` to a model enabled for that project.

## 5. Start the chatbot

In the project directory:

```bash
npm run dev
```

Wait until the terminal reports that the development server is ready. Open <http://localhost:3000>.

To stop the server, click the terminal and press `Ctrl+C`.

## 6. Check configuration before sending a prompt

Open this URL in your browser while the dev server is running:

<http://localhost:3000/api/health>

If everything is configured, expect a JSON response broadly like:

```json
{
  "status": "ok",
  "checks": {
    "openaiConfigured": true,
    "mongodbConfigured": true,
    "mongodbReachable": true
  },
  "model": "gpt-4.1-mini",
  "database": "vibe_chat"
}
```

This endpoint only checks whether the OpenAI key is present and whether the MongoDB connection can be pinged. It does not send a paid prompt to OpenAI. It never returns the secret values.

If `mongodbReachable` is false, use the Atlas troubleshooting steps below. If the endpoint returns `needs-configuration`, check `.env.local` and restart Next.js.

## 7. Test all required features

1. **Chat:** send `Explain recursion with a short Python example.`
2. **Streaming:** confirm the assistant message appears progressively rather than all at once.
3. **Tone:** select `Concise`, ask a question, then select `Professional` and ask a similar question. The chosen tone is sent to the server as a system instruction.
4. **History:** start a new conversation, then click the first conversation in the sidebar to reopen it.
5. **Persistence:** refresh the page; history should still be present.
6. **Extra feature — prompt suggestions:** start a fresh chat and click one of the prompt suggestions.
7. **Extra feature — copy response:** click **Copy** under an assistant answer and paste it into a text editor.
8. **Database:** open Atlas → your deployment → **Browse Collections**. Find the `vibe_chat` database and `conversations` collection after the first prompt is saved. Documents should contain a title, tone, timestamps, and messages.
9. **Error handling:** temporarily stop the network or use an invalid environment variable in a local test, and check that the UI shows an error rather than silently pretending the request worked. Restore the valid configuration after testing.

Before submission, run:

```bash
npm run typecheck
npm run build
```

Both commands should finish successfully. I could not complete dependency installation in the generation environment, so these checks must be performed on your own machine before treating the build as verified.

## 8. Troubleshooting

### `MONGODB_URI is missing`

- Confirm the file is named exactly `.env.local`, not `.env.local.txt`.
- Confirm `.env.local` is in the same folder as `package.json`.
- Restart `npm run dev` after edits.

### MongoDB `bad auth` / authentication failed

- Use the **database user** from Database Access, not your Atlas website login.
- Recheck the username and password in the URI.
- Remove placeholder brackets like `<` and `>`.
- Percent-encode reserved characters in the password or reset it to a generated letters-and-numbers password.

### MongoDB server selection timeout / IP not allowed

- Add your current public IP in **Security → Network Access**.
- Confirm the IP entry is active.
- Check that the Atlas cluster is running and that you copied its connection string, including the correct hostname.
- If you changed networks, check whether your public IP changed.

### `ENOTFOUND` or DNS/SRV errors

- Copy the URI again from Atlas **Connect → Drivers**; check for typos or missing cluster hostname.
- Ensure the network allows DNS lookups and outbound database connections.

### OpenAI `401` / authentication error

- Create a fresh key and replace `OPENAI_API_KEY`.
- Ensure there are no quotation marks or spaces accidentally included in the value.
- Keep the key private and on the server.

### OpenAI `429`, quota, billing, or model-access error

- Check API usage limits, available credits/billing, and the selected API project.
- Confirm `OPENAI_MODEL` is available to your API project.
- Do not assume a ChatGPT subscription automatically supplies API credits.

### Changes in `.env.local` do not take effect

Stop and restart the dev server. Next.js loads local environment variables when the application starts.

### `npm install` fails

- Verify `node --version` is 20.9 or newer.
- Check internet access and the last npm error printed in the terminal.
- Try `npm cache verify`, then `npm install` again.
- If a prior install left a broken `node_modules`, stop the server, remove `node_modules`, and rerun `npm install`. Do not delete source files or `.env.local`.

## 9. Prepare and publish to GitHub

### Check for secrets before committing

Run these commands in the project folder:

```bash
git status --short
git check-ignore -v .env.local
```

The second command should show that `.env.local` is ignored. Also ensure `api.txt` is not inside the project and is never staged.

If you accidentally committed a key, deleting the file in a later commit does not make the earlier key safe. Revoke the key immediately, then remove the secret from Git history before publishing.

### Initialise Git and commit the project

If the folder is not already a Git repository:

```bash
git init
git add .
git status --short
```

Carefully inspect the staged changes. Do not continue if `.env.local`, `api.txt`, credentials, `node_modules`, or build output appears in the staged files.

Then commit and push:

```bash
git commit -m "feat: build Vibe AI chat assistant"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Create an empty **public** repository on GitHub first. Replace the sample URL with your repository's actual URL. If you already have an `origin`, inspect it with `git remote -v` instead of adding it a second time.

Finally:

1. Open the GitHub repository in a private/incognito window and confirm it is public.
2. Check that the README and source files are visible.
3. Confirm no keys, `.env.local`, `api.txt`, or database passwords are present.
4. Copy the repository URL exactly and submit it through the required submission platform.

## 10. What the project does and does not include

Included: streaming chat, recent conversations, conversation loading, MongoDB persistence, a server-side tone modifier, prompt suggestions, copy response, and a configuration health check.

Not included: user authentication, user-specific access control, rate limiting, or production deployment. In this assessment build, conversations are not isolated by user. Do not deploy it publicly for real users or sensitive data without adding authentication and per-user authorization first.

## Official references

- Next.js installation and Node.js version requirement: <https://nextjs.org/docs/app/getting-started/installation>
- MongoDB Atlas free cluster: <https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/>
- MongoDB Atlas network/security quickstart: <https://www.mongodb.com/docs/atlas/security/quick-start/>
- MongoDB Atlas application connection: <https://www.mongodb.com/docs/atlas/driver-connection/>
- MongoDB Node.js driver getting started: <https://www.mongodb.com/docs/drivers/node/current/get-started/>
- OpenAI API keys: <https://platform.openai.com/api-keys>
- OpenAI API vs ChatGPT billing: <https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform>
