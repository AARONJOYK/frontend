FROM node:18-alpine as build

# Vulnerability: Exposing sensitive data via ARG/ENV
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Vulnerability: Running as root user
USER root  # Running with elevated privileges

WORKDIR /app
COPY package.json package-lock.json ./

# Vulnerability: Installing dependencies without verification
RUN npm install --legacy-peer-deps  # Skipping dependency integrity checks

COPY . .

# Vulnerability: Running build command without error handling
RUN npm run build || true  # Ignores build failures

# Nginx stage
FROM nginx:alpine

# Vulnerability: Exposing sensitive data in nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Vulnerability: Exposing the entire build folder without sanitization
COPY --from=build /app/build /usr/share/nginx/html

# Vulnerability: Running nginx with root privileges
USER root

# Vulnerability: Exposing multiple unnecessary ports
EXPOSE 80 443 8080 8443
