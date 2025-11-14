@echo off
echo ==============================
echo  UPLOADING ALL KB ARTICLES...
echo ==============================

set URL=https://propscholar-ai-bot.onrender.com/admin/kb
set KEY=propscholar2069

echo -- Uploading: Instant Accounts --
curl -X POST "%URL%" -H "x-admin-key: %KEY%" -H "Content-Type: application/json" -d ^
"{\"title\":\"How Instant Accounts Work\",\"content\":\"PropScholar introduced a scholarship-backed model for Instant Accounts. Instead of paying expensive upfront fees, traders prove their skills in an affordable evaluation. Once passed, PropScholar pays the entire fee for the Instant Funded Account.\n\nHow It Works:\n1. Start With PropScholar Evaluation.\n2. Prove Your Skills.\n3. We Pay For Your Instant Account.\n4. Trade Funded Capital.\n\nWhy This Matters:\n• No high upfront cost.\n• Access to capital purely based on skill.\n• Fast track to instant funding.\",\"category\":\"Instant Accounts\",\"url\":\"https://help.propscholar.com/article/instant-accounts\"}"

echo -- Uploading: Next Steps After Clearing Phase 1 --
curl -X POST "%URL%" -H "x-admin-key: %KEY%" -H "Content-Type: application/json" -d ^
"{\"title\":\"Next Steps After Clearing Phase 1\",\"content\":\"Once a trader passes Phase 1, the account is placed under review. Within 36 hours, the trader receives Phase 2 credentials and the Phase 1 certificate. If not received, contact support.\",\"category\":\"Evaluation Process\",\"url\":\"https://help.propscholar.com/article/next-steps-after-phase-1\"}"

echo -- Uploading: Account Delivery Time --
curl -X POST "%URL%" -H "x-admin-key: %KEY%" -H "Content-Type: application/json" -d ^
"{\"title\":\"How Long Until You Receive Your Account\",\"content\":\"Order confirmation email is sent in 120 milliseconds. Account credentials arrive within seconds but may take up to 24 hours. If no confirmation is received instantly, contact support with proof of payment.\",\"category\":\"Account Delivery\",\"url\":\"https://help.propscholar.com/article/account-receive-time\"}"

echo -- Uploading: Payment Methods --
curl -X POST "%URL%" -H "x-admin-key: %KEY%" -H "Content-Type: application/json" -d ^
"{\"title\":\"Choose Your Payment Method\",\"content\":\"PropScholar supports PayPal, PhonePe (UPI), and Crypto payments. All payments are encrypted with 256-bit security.\nAfter payment, you instantly receive order confirmation, credentials, and a downloadable receipt.\",\"category\":\"Payments\",\"url\":\"https://help.propscholar.com/article/payment-methods\"}"

echo -- Uploading: Choosing the Right Evaluation --
curl -X POST "%URL%" -H "x-admin-key: %KEY%" -H "Content-Type: application/json" -d ^
"{\"title\":\"Find The Right Evaluation Challenge\",\"content\":\"PropScholar offers 45+ evaluation challenges from $5 to $100+. Prices vary based on scholarship reward (up to 400% return). Choose based on:\n1. Your budget.\n2. Scholarship amount you want.\nStart small and re-evaluate multiple times before scaling.\",\"category\":\"Evaluation Selection\",\"url\":\"https://help.propscholar.com/article/find-right-evaluation\"}"

echo ==============================
echo  ALL KB ITEMS UPLOADED! 🎉
echo ==============================
pause
