FROM node:21.5.0-alpine3.18
COPY . /workspace
WORKDIR /workspace
RUN npm install
EXPOSE 3000
CMD npm start