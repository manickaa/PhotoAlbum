/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html 
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * 
 */

const AWS = require('aws-sdk');
//Construct a client, with SDK version as v4
const S3 = new AWS.S3({signatureVersion: 'v4'});
//construct sharp
const Sharp = require('sharp');
//import the dynamodb client and uuid module
const DynamoDBDocClient = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const uuidv4 = require('uuid');

//Extract the name of the photos tablle from an environment variable
const DYNAMODB_PHOTOS_TABLE_NAME = process.env.DYNAMODB_PHOTOS_TABLE_ARN.split('/')[1];

//constants for storing height and width
const THUMBNAIL_WIDTH = parseInt(process.env.THUMBNAIL_WIDTH, 10);
const THUMBNAIL_HEIGHT = parseInt(process.env.THUMBNAIL_HEIGHT, 10);

//function to handle putting our new photo infor into Dynamodb
function storePhotoInfo(item) {
    const params = {
        Item: item,
        TableName: DYNAMODB_PHOTOS_TABLE_NAME
    };
    return DynamoDBDocClient.put(params).promise();
}
//function to make thumbnail of a original photo
function makeThumbnail(photo) {
    return Sharp(photo).resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT).toBuffer();
}

//function to get the thumbnail key from the original photo
function thumbnailKey(photoName) {
    return `public/resized/${photoName}`;
}

//function to get the key of the original sized photo
function fullsizeKey(photoName) {
    return `public/${photoName}`;
}

//asyn function to get the metadata for a photo
async function getMetadata(bucketName, key) {
    const headResult = await S3.headObject({Bucket: bucketName,
    Key: key}).promise();
    return headResult.Metadata;
}
//async function to resize the photos in the passed bucket
async function resize(bucketName, key) {
    //get the original photo from the bucket and key
    const originalPhoto = (await S3.getObject({Bucket: bucketName, Key: key}).promise()).Body;

    const originalPhotoName = key.replace('uploads/', '');
    console.log("****");
    console.log(originalPhotoName);
    console.log("****");
    const originalPhotoDimensions = await Sharp(originalPhoto).metadata();

    const thumbnail = await makeThumbnail(originalPhoto);

    await Promise.all([
        //Adds the thumbnail to the bucket
        S3.putObject({
            Body: thumbnail,
            Bucket: bucketName,
            Key: thumbnailKey(originalPhotoName),
        }).promise(),

        S3.copyObject({
            Bucket: bucketName,
            CopySource: bucketName + '/' + key,
            Key: fullsizeKey(originalPhotoName),
        }).promise(),
    ]);

    await S3.deleteObject({
        Bucket: bucketName,
        Key: key
    }).promise();

    return {
        photoId: originalPhotoName,
        thumbnail: {
            key: thumbnailKey(originalPhotoName),
            width: THUMBNAIL_WIDTH,
            height: THUMBNAIL_HEIGHT
        },
        fullsize: {
            key: fullsizeKey(originalPhotoName),
            width: originalPhotoDimensions.width,
            height: originalPhotoDimensions.height
        }
    };

};
//async function to process all the photos in uploads and extract its bucketname and key needed to resize
async function processRecord(record) {
    const bucketName = record.s3.bucket.name;
    const key = record.s3.object.key;
    console.log(bucketName, key)
    if(key.indexOf('uploads') != 0) return;

    const metadata = await getMetadata(bucketName, key);
    const sizes = await resize(bucketName, key);    
    const id = uuidv4.v4();
    const item = {
        id: id,
        owner: metadata.owner,
        photoAlbumId: metadata.albumid,
        bucket: bucketName,
        thumbnail: sizes.thumbnail,
        fullsize: sizes.fullsize,
        createdAt: new Date().getTime()
    }
    await storePhotoInfo(item);

}
exports.lambdaHandler = async (event, context, callback) => {
    try {
        console.log(JSON.stringify(event));
        event.Records.forEach(processRecord);
        callback(null, {status: 'Photo Processed'});
    } catch (err) {
        console.log(err);
        callback(err);
    }
};
