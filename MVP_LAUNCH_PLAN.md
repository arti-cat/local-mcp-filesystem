# MVP Launch Plan - local-mcp-filesystem

## Goal
Launch open source MCP bridge + validate market for hosted service

## Week 1: Publish & Validate (Days 1-7)

### Day 1: Prepare Package
- [ ] Remove unneeded directories: `rm -rf chatgpt-mcp-filesystem/ stdio-adapter/ fastapi_first_steps_snippet.txt`
- [ ] Update `package.json` with your name/email/GitHub
- [ ] Test locally: `npm link && npx local-mcp-filesystem --help`
- [ ] Commit: `git add . && git commit -m "chore: prepare for npm publish"`

### Day 2: Publish to npm
- [ ] Create npm account: https://www.npmjs.com/signup
- [ ] Login: `npm login`
- [ ] Publish: `npm publish`
- [ ] Test install: `npx local-mcp-filesystem`

### Day 3: Announce in Forums
Post in these 5 threads with simple message:

```
I built a solution for this - one command to bridge any MCP server to ChatGPT:

npx local-mcp-filesystem

It handles:
- STDIO → HTTP bridge
- Automatic Cloudflare tunnel
- Proper JSON-RPC formatting
- 30s timeouts (no more ClosedResourceError)

Open source: [your-github-url]

If you need help setting up, DM me.
```

Forum URLs:
1. https://community.openai.com/t/access-mcp-server-request-timeout/1362010
2. https://community.openai.com/t/how-to-set-up-a-remote-mcp-server-and-connect-it-to-chatgpt-deep-research/1278375
3. https://community.openai.com/t/closedresourceerror-on-mcp-via-ngrok/1362417

### Days 4-7: Monitor & Respond
- [ ] Answer questions in forum threads
- [ ] Track npm downloads
- [ ] Note what people ask for (this tells you what to build)

## Week 2-3: Build Hosted MVP (Only if people show interest)

### Core Features (Keep it simple)
1. **User submits MCP command** (web form)
2. **You run it in Docker** (isolation)
3. **Return persistent URL** (save to database)
4. **Charge via Stripe** ($15/month)

### Tech Stack (Use what you know)
- **Frontend**: Single HTML page (no framework)
- **Backend**: Fastify (you already built this)
- **Database**: SQLite (simplest)
- **Hosting**: Railway or Fly.io ($5-10/month)
- **Payments**: Stripe Checkout (easiest)

### MVP Scope (Do NOT add these yet)
- ❌ No team features
- ❌ No custom domains
- ❌ No analytics dashboard
- ❌ No OAuth
- ✅ Just: paste command → get URL → pay

### Files to Create
```
hosted-service/
├── server.js          # Fastify server (copy from lib/server.js)
├── index.html         # Simple form
├── db.js              # SQLite wrapper
└── package.json       # Dependencies
```

## Week 4: Launch Hosted Service

### Pre-launch
- [ ] Test with 2-3 beta users (from forums)
- [ ] Set up Stripe account
- [ ] Deploy to Railway/Fly.io
- [ ] Create landing page (1 page, no fancy design)

### Launch
- [ ] Post in same forum threads: "Now offering hosted version"
- [ ] Pricing: $15/month for 3 MCP servers

## Success Metrics

**Week 1:**
- npm downloads > 50
- Forum replies > 10
- DMs from interested users > 3

**Week 4:**
- Paying customers > 5 ($75/month revenue)
- If yes → continue building
- If no → pivot or move on

## What NOT to Do
- ❌ Don't build features nobody asked for
- ❌ Don't spend time on branding/design
- ❌ Don't add complexity (team features, SSO, etc.)
- ❌ Don't overthink pricing
- ✅ Ship fast, talk to users, iterate

## Revenue Target
- Month 1: $75 (5 customers)
- Month 2: $300 (20 customers)
- Month 3: $750 (50 customers)

If you hit Month 2 target → this is real, keep going
If not → learn what people actually want and pivot
