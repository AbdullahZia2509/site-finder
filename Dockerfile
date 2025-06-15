FROM node:18

# Install Tippecanoe and dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libsqlite3-dev \
    zlib1g-dev \
    libprotobuf-dev \
    protobuf-compiler \
    libtbb-dev \
    libboost-system-dev \
    libboost-filesystem-dev \
    libboost-thread-dev \
    libboost-iostreams-dev \
    libboost-program-options-dev \
    libboost-python-dev \
    python3-dev \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Tippecanoe from source
RUN git clone https://github.com/mapbox/tippecanoe.git /tmp/tippecanoe \
    && cd /tmp/tippecanoe \
    && make -j$(nproc) \
    && make install \
    && cd / \
    && rm -rf /tmp/tippecanoe

WORKDIR /app

# Install global npm packages
RUN npm install -g mapshaper

# Copy package files first for better caching
COPY package*.json ./


# Install project dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p /app/public/optimized /app/public/vector-tiles

# Set the default command to run the optimization script
CMD ["node", "scripts/optimize-geojson.js"]
