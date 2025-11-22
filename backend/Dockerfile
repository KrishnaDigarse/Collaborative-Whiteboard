# Stage 1: Build the application
FROM gradle:jdk21-jammy AS builder
WORKDIR /app
COPY . .
RUN ./gradlew bootJar --no-daemon

# Stage 2: Run the application
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
