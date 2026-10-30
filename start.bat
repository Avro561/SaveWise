@echo off
title SaveWise - Smart Expense & Savings Advisor
echo ====================================================
echo Starting SaveWise Server...
echo ====================================================
start http://localhost:5050
node server.js
pause
