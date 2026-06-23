FROM golang:1.23-alpine AS builder

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -o api-go ./cmd/api

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /build/api-go ./api-go
EXPOSE 8090
CMD ["./api-go"]
