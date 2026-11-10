# syntax=docker/dockerfile:1.7

FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build
WORKDIR /src

COPY Mtf.Api/Mtf.Api.csproj Mtf.Api/
RUN dotnet restore Mtf.Api/Mtf.Api.csproj

COPY Mtf.Api/ Mtf.Api/
RUN dotnet publish Mtf.Api/Mtf.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app

# Npgsql loads GSSAPI from krb5-libs; without it the first connection logs an error
RUN apk add --no-cache krb5-libs

USER app

COPY --from=build /app/publish .

ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=true

EXPOSE 5000

# PORT is injected by Render at runtime; defaults to 5000 for local docker (ADR 0009, rule 1)
ENTRYPOINT ["sh", "-c", "exec dotnet Mtf.Api.dll --urls http://+:${PORT:-5000}"]
