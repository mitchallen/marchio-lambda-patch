#!/bin/bash

# chmod +x (this script)

KIT_FOLDER=temp-kit
FUNC=marchio-patch
REGION=us-east-1
ZIP_FILE=pkg-lambda.zip

rm -rf $KIT_FOLDER/
mkdir $KIT_FOLDER 
cp -v  ./package.json $KIT_FOLDER
cp -v  ./.env $KIT_FOLDER
cp -Rv ./modules  $KIT_FOLDER/modules
cp -v  ./lambda.js $KIT_FOLDER/index.js

cd $KIT_FOLDER
npm install --production
zip -r $ZIP_FILE index.js .env modules/ node_modules/

echo "*** Deploying to AWS Lambda ... ***"

aws lambda update-function-code --region $REGION --function-name $FUNC --zip-file fileb://$ZIP_FILE

echo "EXECUTE: $ rm -rf $KIT_FOLDER/"