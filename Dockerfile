FROM node:18.20.5
ENV NODE_ENV=production

COPY ["package.json","package-lock.json*","./"]

RUN npm install --production

COPY . .

EXPOSE 8080

CMD ["node","index.js"]