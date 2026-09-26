#!/bin/bash
cd backend
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5540/voteuasz_db
export SPRING_DATASOURCE_USERNAME=uasz_admin
export SPRING_DATASOURCE_PASSWORD=bXYJF_dv9Jk3BT62xPCfekyFl0EZuHL1UvS63CJMqI_DB_PASS
export JWT_SECRET="bXYJF//dv9Jk3BT62xPCfekyFl0EZuHL1UvS63CJMqI="
export CRYPTO_SECRET="YwenxzDARa1Mm2RxxhDSnROZC42fxYHD4C+EYFvk2d0="
export SERVER_PORT=8081
mvn spring-boot:run
