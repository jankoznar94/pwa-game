#!/bin/bash
export GOOGLE_APPLICATION_CREDENTIALS=***
cd /home/martin_fabian/pwa-game
/home/martin_fabian/.hermes/node/bin/firebase deploy --only hosting --project pwa-game-1b059
