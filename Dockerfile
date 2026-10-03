FROM node:22-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY quiz-web/package.json quiz-web/package-lock.json ./
RUN npm ci
COPY quiz-web/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-17 AS backend
WORKDIR /build/backend
COPY quiz-api/pom.xml ./
RUN mvn -B dependency:go-offline
COPY quiz-api/src/ ./src/
COPY --from=frontend /build/frontend/dist/ ./src/main/resources/static/
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -g 1000 app && useradd -u 1000 -g app -m app
WORKDIR /app
COPY --from=backend --chown=app:app /build/backend/target/quiz-api-0.0.1-SNAPSHOT.jar ./app.jar
COPY --chown=app:app deploy/entrypoint.sh ./entrypoint.sh
RUN chmod 755 ./entrypoint.sh
USER app
ENV SPRING_PROFILES_ACTIVE=prod
ENV ORACLE_TNS_ADMIN=/tmp/quizz-app-wallet
ENV JAVA_TOOL_OPTIONS="-Xms64m -Xmx224m -XX:MaxMetaspaceSize=160m -XX:ReservedCodeCacheSize=48m -XX:+UseSerialGC -Xss512k"
EXPOSE 8080
ENTRYPOINT ["/app/entrypoint.sh"]
