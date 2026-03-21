.PHONY: test run docker-build docker-run clean seed

test:
	pytest -v tests/

run:
	cp .env.example .env
	echo "⚠️  Edit .env with your Twilio credentials first!"
	flask --debug run

docker-build:
	docker build -t whatsapp-booking-demo .

docker-run:
	docker-compose up -d

clean:
	rm -f bookings.db
	rm -rf __pycache__ .pytest_cache .coverage htmlcov/.coverage

seed:
	FLASK_APP=app flask shell -c "from app import seed_services; seed_services()"