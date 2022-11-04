From node:18.0.0-alpine AS tplbuilder
LABEL maintainer "Polar Squad <https://www.polarsquad.com/>"

ARG FRONTEND_THEME

COPY --chown=node ./ /app

RUN apk add git --no-cache && \
    rm -rf /var/cache/apk/*

USER node

WORKDIR /app

# Install required system packages and dependencies & build the tpl

RUN npm install --legacy-peer-deps

RUN if [ "$FRONTEND_THEME" != "default" ]; then \
        git clone https://github.com/InfoCompass/${FRONTEND_THEME}.git custom/${FRONTEND_THEME}; \
    fi

RUN npm run build -- $FRONTEND_THEME dist


# Copy Generated tpl to Proxy container

From nginx:1.21.6-alpine
# Set working directory to nginx asset directory
WORKDIR /usr/share/nginx/html
# Remove default nginx static assets
RUN rm -rf ./*
#COPY --chown=root ./nginx/default.conf /etc/nginx/conf.d
COPY --chown=nginx --from=tplbuilder /app/build/dist /usr/share/nginx/html

#RUN ls /etc/nginx/conf.d && cat /etc/nginx/conf.d/default.conf



