# Akool Streaming Avatar React Demo

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/AKOOL-Official/akool-streaming-avatar-react-demo/deploy.yml?branch=main)](https://github.com/AKOOL-Official/akool-streaming-avatar-react-demo/actions)
[![Demo](https://img.shields.io/badge/Demo-Live%20Demo-blue.svg)](https://akool-official.github.io/akool-streaming-avatar-react-demo/)

A React-based demo application showcasing Akool's Streaming Avatar service with real-time voice interaction, network quality monitoring, and chat functionality.

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [API Setup](#-api-setup)
- [Development](#-development)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

## ✨ Features

- 🎭 **Real-time Avatar Streaming** - Live avatar rendering with voice synchronization
- 🎤 **Voice Interaction** - Two-way voice communication with the avatar
- 💬 **Chat Interface** - Text-based messaging with the avatar
- 📊 **Network Quality Monitoring** - Real-time statistics and performance metrics
- 🌍 **Multi-language Support** - Internationalization for global users
- 🎨 **Customizable Avatars** - Multiple avatar and voice options
- 📱 **Responsive Design** - Works seamlessly across devices
- ⚡ **Low Latency** - Optimized for real-time interactions

## 🛠 Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Real-time Communication**: Agora RTC SDK
- **Styling**: CSS3 with modern design patterns
- **Package Manager**: pnpm
- **Build Tool**: Vite
- **State Management**: React Context API

## 📋 Prerequisites

- **Node.js**: v22.11.0 or higher
- **pnpm**: Latest version (recommended package manager)
- **Akool API Token**: Valid authentication token for the Streaming Avatar service
- **Modern Browser**: Chrome, Firefox, Safari, or Edge with WebRTC support

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/AKOOL-Official/akool-streaming-avatar-react-demo
cd akool-streaming-avatar-react-demo
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

Create a `.env` file in the root directory:

```bash
cp .env.development .env.development.local
```

Edit `.env.development.local` with your configuration:

```env
VITE_OPENAPI_HOST=https://openapi.akool.com
VITE_OPENAPI_TOKEN=your_access_token_here
VITE_SERVER_BASE=/streaming/avatar
```

**Note:** Replace `your_access_token_here` with the token obtained from the `/api/open/v3/getToken` endpoint.

### 4. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:5173/streaming/avatar`

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_OPENAPI_HOST` | Akool API base URL | `https://openapi.akool.com` | Yes |
| `VITE_OPENAPI_TOKEN` | Your Akool API authentication token | - | Yes |
| `VITE_SERVER_BASE` | Server base URL | `/streaming/avatar` | Yes |

### Application Settings

The demo includes configurable options for:

- **Avatar Selection**: Choose from available avatar models
- **Voice Settings**: Adjust voice parameters and language
- **Network Configuration**: Customize RTC settings
- **UI Preferences**: Theme and layout options

## 🔑 API Setup

### Obtaining an Akool API Token

1. **Sign Up**: Create an account at [Akool](https://akool.com)
2. **Login**: Access your account dashboard
3. **Get Credentials**: 
   - Click the picture icon in the upper right corner
   - Select "API Credentials" function
   - Set up your key pair (`clientId`, `clientSecret`) and save it
4. **Generate Token**: Use your credentials to obtain an access token via API call
5. **Use Token**: Include the token in your API requests as a Bearer token

#### Token Generation API

To get your access token, make a POST request to:

```bash
POST https://openapi.akool.com/api/open/v3/getToken
```

**Request Body:**
```json
{
  "clientId": "your_client_id_here",
  "clientSecret": "your_client_secret_here"
}
```

**Response:**
```json
{
  "code": 1000,
  "token": "your_access_token_here"
}
```

**Note:** The generated token is valid for more than 1 year.

#### Using the Token

Include your API token in the HTTP header for all API requests:

```bash
Authorization: Bearer your_access_token_here
```

### Security Best Practices

- 🔒 **Never commit API tokens** to version control
- 🔄 **Rotate tokens regularly** for enhanced security (tokens are valid for >1 year)
- 📝 **Use environment variables** for all sensitive data
- 🛡️ **Implement proper CORS** settings in production
- 🔐 **Keep clientId and clientSecret secure** - these are used to generate your access token
- ⚠️ **Production requests must be routed through your backend server** - never expose tokens in client-side code

## 🏗️ Development

### Project Structure

```
src/
├── components/          # React components
│   ├── AvatarSelector/  # Avatar selection interface
│   ├── ChatInterface/   # Chat functionality
│   ├── ConfigurationPanel/ # Settings panel
│   ├── NetworkQuality/  # Network monitoring
│   ├── VideoDisplay/    # Avatar video display
│   └── VoiceSelector/   # Voice selection
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── agoraHelper.ts      # Agora RTC integration
└── apiService.ts       # API communication
```

### Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm dev:https        # Start with HTTPS

# Building
pnpm build            # Build for development
pnpm build:prod       # Build for production
pnpm preview          # Preview production build

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Run prettier
```

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/amazing-feature`
3. **Make** your changes and test thoroughly
4. **Commit** with descriptive messages: `git commit -m 'Add amazing feature'`
5. **Push** to your branch: `git push origin feat/amazing-feature`
6. **Create** a Pull Request

## 📊 Network Quality Monitoring

The application provides comprehensive real-time monitoring:

### Metrics Displayed

- **Video Statistics**: Frame rate, resolution, bitrate
- **Audio Statistics**: Sample rate, bitrate, packet loss
- **Network Performance**: Latency, jitter, packet loss rates
- **End-to-End Delay**: Total processing time
- **Connection Quality**: Overall network health score

### Performance Optimization

- **Adaptive Bitrate**: Automatic quality adjustment
- **Connection Recovery**: Automatic reconnection handling
- **Quality Indicators**: Visual feedback for network status

## 🌐 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Full Support |
| Firefox | 88+ | ✅ Full Support |
| Safari | 14+ | ✅ Full Support |
| Edge | 90+ | ✅ Full Support |

## 🚀 Deployment

### Production Build

```bash
pnpm build:prod
```

### Deployment Options

#### Static Hosting (Netlify, Vercel, etc.)

1. Build the application: `pnpm build:prod`
2. Upload the `dist` folder to your hosting provider
3. Configure environment variables in your hosting platform
4. Set up custom domain if needed

#### Docker Deployment

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install -g pnpm
RUN pnpm install
COPY . .
RUN pnpm build:prod

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🔧 Troubleshooting

### Common Issues

#### 1. API Token Authentication Error

**Problem**: "Invalid API token" or "Authentication failed"

**Solution**:
- Verify your API token is correct
- Check if the token has expired
- Ensure the token has proper permissions

#### 2. WebRTC Connection Issues

**Problem**: Avatar not loading or voice not working

**Solution**:
- Check browser WebRTC support
- Verify microphone permissions
- Check firewall/network restrictions
- Try refreshing the page

#### 3. Network Quality Problems

**Problem**: Poor video/audio quality

**Solution**:
- Check internet connection speed
- Close other bandwidth-intensive applications
- Try different network (mobile hotspot)
- Check browser console for errors

#### 4. Development Server Issues

**Problem**: `pnpm dev` fails to start

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check Node.js version
node --version  # Should be >= 22.11.0
```

### Getting Help

- 📖 **Documentation**: [Akool API Docs](https://docs.akool.com)
- 🔐 **Authentication Guide**: [Akool Authentication Usage](https://docs.akool.com/authentication/usage)
- 💬 **Community**: [GitHub Discussions](https://github.com/AKOOL-Official/akool-streaming-avatar-react-demo/discussions)
- 🐛 **Issues**: [GitHub Issues](https://github.com/AKOOL-Official/akool-streaming-avatar-react-demo/issues)
- 📧 **Support**: info@akool.com

### Development Setup

1. **Fork** and clone the repository
2. **Install** dependencies: `pnpm install`
3. **Create** a feature branch
4. **Make** your changes
5. **Test** thoroughly
6. **Submit** a pull request

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Akool](https://akool.com) for providing the Streaming Avatar API
- [Agora](https://agora.io) for real-time communication technology
- [React](https://reactjs.org) community for the amazing framework
- All contributors who help improve this demo

---

**Made with ❤️ by the Akool Team**
# akool-poc
