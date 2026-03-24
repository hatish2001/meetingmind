#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
cat << 'EOF'
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ███╗   ███╗██╗███████╗███████╗██╗ ██████╗ ███╗   ██╗         ║
║   ████╗ ████║██║██╔════╝██╔════╝██║██╔═══██╗████╗  ██║         ║
║   ██╔████╔██║██║███████╗███████╗██║██║   ██║██╔██╗ ██║         ║
║   ██║╚██╔╝██║██║╚════██║╚════██║██║██║   ██║██║╚██╗██║         ║
║   ██║ ╚═╝ ██║██║███████║███████║██║╚██████╔╝██║ ╚████║         ║
║   ╚═╝     ╚═╝╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝         ║
║                                                               ║
║   Your AI Meeting Assistant - Quick Installer                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            OS=$ID
        else
            OS="linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
    echo $OS
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install dependencies based on OS
install_dependencies() {
    local os=$1
    echo -e "${YELLOW}Installing dependencies for $os...${NC}"
    
    case $os in
        ubuntu|debian|linuxmint)
            sudo apt-get update
            sudo apt-get install -y nodejs npm ffmpeg
            ;;
        fedora|rhel|centos)
            sudo dnf install -y nodejs npm ffmpeg
            ;;
        arch|manjaro)
            sudo pacman -Syu --noconfirm nodejs npm ffmpeg
            ;;
        macos)
            if ! command_exists brew; then
                echo -e "${RED}Homebrew not found. Please install from https://brew.sh${NC}"
                exit 1
            fi
            brew install node ffmpeg
            ;;
        windows)
            echo -e "${RED}For Windows, please use Docker or WSL.${NC}"
            echo -e "${YELLOW}Alternatively, download Node.js from https://nodejs.org and install manually.${NC}"
            exit 1
            ;;
        *)
            echo -e "${RED}Unsupported OS: $os${NC}"
            exit 1
            ;;
    esac
    
    # Ensure Node.js version is adequate
    local node_version=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
    if [ -z "$node_version" ] || [ "$node_version" -lt 16 ]; then
        echo -e "${RED}Node.js 16+ required. Please update Node.js.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Dependencies installed successfully!${NC}"
}

# Get installation directory
get_install_dir() {
    local default_dir="$HOME/meetingmind"
    
    if [ -d "$default_dir" ]; then
        read -p "Directory $default_dir exists. Use it? [Y/n]: " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            echo "$default_dir"
            return
        fi
    fi
    
    read -p "Enter installation directory [$default_dir]: " install_dir
    install_dir=${install_dir:-$default_dir}
    echo "$install_dir"
}

# Download or copy application
get_app() {
    local install_dir=$1
    local method=$2
    
    if [ -d "$(dirname $0)" ] && [ -f "$(dirname $0)/package.json" ]; then
        # Running from source directory
        echo -e "${YELLOW}Copying application from current directory...${NC}"
        mkdir -p "$install_dir"
        cp -r "$(dirname $0)/." "$install_dir/"
    else
        # Clone from GitHub
        echo -e "${YELLOW}Cloning MeetingMind from GitHub...${NC}"
        if command_exists gh; then
            gh repo clone harishraj/meetingmind "$install_dir" 2>/dev/null || \
            git clone https://github.com/harishraj/meetingmind.git "$install_dir"
        else
            git clone https://github.com/harishraj/meetingmind.git "$install_dir"
        fi
    fi
    
    echo "$install_dir"
}

# Install npm packages
install_packages() {
    local dir=$1
    echo -e "${YELLOW}Installing npm packages...${NC}"
    cd "$dir"
    npm install
    echo -e "${GREEN}Packages installed!${NC}"
}

# Setup environment
setup_env() {
    local dir=$1
    
    if [ ! -f "$dir/.env" ]; then
        cp "$dir/.env.example" "$dir/.env"
        echo -e "${YELLOW}Created .env file. Please add your MiniMax API key.${NC}"
        echo -e "${BLUE}Get your API key from: https://minimax.chat/${NC}"
    fi
}

# Start the application
start_app() {
    local dir=$1
    local background=$2
    
    cd "$dir"
    
    echo -e "${YELLOW}Starting MeetingMind server...${NC}"
    
    if [ "$background" = "true" ]; then
        if command_exists pm2; then
            pm2 start "$dir/backend/server.js" --name meetingmind
        elif command_exists screen; then
            screen -dmS meetingmind bash -c "cd $dir && npm start"
        else
            nohup npm start > "$dir/server.log" 2>&1 &
            echo $! > "$dir/server.pid"
        fi
        echo -e "${GREEN}MeetingMind started in background!${NC}"
    else
        npm start
    fi
}

# Main installation
main() {
    local os=$(detect_os)
    echo -e "${BLUE}Detected OS: $os${NC}"
    echo ""
    
    # Check for required commands
    if ! command_exists git; then
        echo -e "${YELLOW}Git not found. Installing...${NC}"
        case $os in
            ubuntu|debian|linuxmint) sudo apt-get install -y git ;;
            fedora|rhel|centos) sudo dnf install -y git ;;
            macos) ;;
        esac
    fi
    
    # Install system dependencies
    if ! command_exists node || ! command_exists npm; then
        install_dependencies $os
    else
        echo -e "${GREEN}Node.js and npm already installed${NC}"
    fi
    
    if ! command_exists ffmpeg; then
        install_dependencies $os
    else
        echo -e "${GREEN}ffmpeg already installed${NC}"
    fi
    
    # Get installation directory
    INSTALL_DIR=$(get_install_dir)
    mkdir -p "$INSTALL_DIR"
    
    # Get application
    APP_DIR=$(get_app "$INSTALL_DIR")
    
    # Install packages
    install_packages "$APP_DIR"
    
    # Setup environment
    setup_env "$APP_DIR"
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Installation complete!${NC}"
    echo ""
    echo -e "📁 Location: ${BLUE}$APP_DIR${NC}"
    echo ""
    echo -e "🚀 To start the server:"
    echo -e "   cd $APP_DIR"
    echo -e "   npm start"
    echo ""
    echo -e "🌐 Then open: ${BLUE}http://localhost:3000${NC}"
    echo ""
    echo -e "⚠️  Don't forget to add your MiniMax API key in ${YELLOW}$APP_DIR/.env${NC}"
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    
    # Ask to start
    read -p "Start the server now? [Y/n]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        start_app "$APP_DIR" "true"
        sleep 2
        echo ""
        echo -e "${GREEN}Server should be running at: http://localhost:3000${NC}"
    fi
}

# Run
main "$@"
