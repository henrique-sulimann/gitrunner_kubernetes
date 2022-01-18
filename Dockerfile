FROM mhart/alpine-node:14

WORKDIR /usr/src/app

COPY package*.json ./
RUN apk --no-cache add git
RUN apk --no-cache add nodejs-npm
RUN npm install

COPY ./dist ./dist
EXPOSE 4000
CMD [ "npm", "start" ]