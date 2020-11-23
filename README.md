# PhotoAlbum

The goal of the project is to develop a photo album app using React.js.

The app allows users to authenticate and sign in to their accounts and create albums. 
The list of albums created by the user is displayed below.
If you click on the created album, the app routes to a new page, which displays all the members who share the ownership of that album.
The user can also add other users to the album, if they want to.
The photos are displayed as thumbnails with fixed length and width. The user can also add photos to the album.
If the user clicks on a photo, a model opens up displaying the original picture and delete button. 
The user can delete that particular photo if they want to.

Using React.js, the front end of the web app is created. 

To create a React app, Node version 8.10 and npm must be installed in the machine.

Then, run the following command :
```
npx create-react-app photo-album
```
This will create a new React app named Photo-Album.

To Run and test the app in local, Navigate to Photo-Album folder and run the command
```
npm start
```

The photo album app utilizes "Semantic-UI React", which provides themes and components as CSS stylesheets.

To install this dependency, run
```
npm i semantic-ui-react --save
```
and add
```
<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.3.1/semantic.min.css"></link>
``` 
to the index.html file.

Once, we have a front-end web page, we need to connect the front-end webpage to a secure highly scalable cloud service.

AWS Amplify allows us to connect the front end to a serverless cloud service. It provides infrastructures like authentication, \
storage, API as a service and also allows to deploy and host the application. It also provides CLI. Amplify CLI bootstraps a cloudformation template to create the infrastructure.

To add Authentication, simply run
```
amplify add auth
```
AWS Cognito User pool is used for authentication and user sign in.
Cognito user pool stores the username and passwords by create a secure user dictionary. It also provides default UI.

We need to create an API to hold the album data and photo data and implement CRUD functions. 
```
amplify add API
```
AWS AppSync builds API with GraphQL. It allows the user to query API with a single GraphQL endpoint.
The Schema for the API is built. For photo album app, two tables for Photos and Albums.

Album has a unique ID, name, owner, and list of photo ID's.
Photo table has a unique ID, albumId, bucket name(the place where the photo is stored), \
FullSize Photo Info(key, width, height), Thumbnail Photo Info (key, width, height)

These tables are create in AWS DynamoDB. 

AppSync creates a GraphQL endpoint to fetch/post data in DynamoDB (NoSQL database)

Although, we can store unlimited items in DynamoDB, the attribute size in each item cannot exceed 400kB. So, its not suitable to store photos in DynamoDB.

AWS S3 (Simple Storage Service) can be utilized to store photos of unlimited size with low cost.
```
amplify add storage
```
To create a random photo name to uniquely identify photos with cryptographically strong random values, uuid dependency is installed
```
npm install uuid
```

Also, to create thumbnails of the photos, AWS Lambda function takes the properties of the album and photos from the DynamoDB and S3, \
resizes them and upload in a resized/ folder in S3.

In order to do that, Cloudfront needs to give permissions and trust role to AWS Lambda & DynamoDB. \
These permissions and roles are given by IAM using the cloudformation template file.

To create the Cloudformation template, SAM CLI is used. 
Docker is used to test the serverless-application locally and build deployment packages.
SAM provides a local environment to use as a Docker container.

SAM packages and deploys the template file to S3, so that we don't need to create this \
template file again and again.

```
sam build
sam deploy --guided
```

The entire full-stack application is deployed and hosted using AWS Amplify

```
amplify publish
```





