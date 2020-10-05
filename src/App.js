import React, {Component}  from 'react';
import {Connect} from 'aws-amplify-react';
import {API, graphqlOperation, Storage} from 'aws-amplify';
import Amplify from 'aws-amplify';
import aws_exports from './aws-exports';
import { withAuthenticator, S3Image } from 'aws-amplify-react';
import './App.css';
import { Divider, Form, Grid, Header, Input, List, Segment, Button, Modal, Icon } from 'semantic-ui-react';
import '@aws-amplify/ui/dist/style.css';

import {BrowserRouter, Route, NavLink} from 'react-router-dom';

import {v4 as uuid} from 'uuid';

Amplify.configure(aws_exports);

//Query to get all albums and store it in a string
const ListAlbums = `query ListAlbums {
  listAlbums(limit: 9999) {
    items {
      id
      name
    }
  }
}`;

//Query to get all the details of a particular album
const GetAlbum = `query GetAlbum($id: ID!, $nextTokenForPhotos: String) {
  getAlbum(id: $id) {
    id
    name
    photos(sortDirection: DESC, nextToken: $nextTokenForPhotos) {
      items {
        thumbnail {
          width
          height
          key
        }
      }
      nextToken
    }
  }
}`;

//Subscriptions - for subscribing to changes in data for real-time functionality like onCreate, onDelete, onUpdate
const SubscribeToNewAlbum = `subscription onCreateAlbum {
  onCreateAlbum {
    id
    name
  }
}`;

//NewAlbum component to create new album and save it
class CreateNewAlbum extends Component {
  
  //create a state to hold the albumName
  constructor(props) {
    super(props);
    this.state = {
      albumName: ''
    };
  }

  //When the user gives an album name, update the state
  editAlbumName = (event) => {
    let change = {};
    console.log(event.target.value)
    change[event.target.name] = event.target.value;
    this.setState(change);
  }

  //Asyn action to update DynamoDB using mutation
  submitAlbumName = async(event) => {
    //Prevent refreshing the page
    event.preventDefault();
    const NewAlbum = `mutation NewAlbum($name: String!) {
      createAlbum(input: {name: $name}) {
        id
        name
      }
    }`;

    //Log the created album's id to console
    const result = await API.graphql(graphqlOperation(NewAlbum, {
      name: this.state.albumName
    }));
    console.info(`Created album with id ${result.data.createAlbum.id}`);
  }

  render() {
    return(
      <Segment>
        <Header as='h3'>Add New Album</Header>
        <Input
          type='text'
          placeholder='New Album Name'
          icon='plus'
          iconPosition='left'
          action={{content: 'Create', onClick: this.submitAlbumName}}
          name='albumName'
          value={this.state.albumName}
          onChange={this.editAlbumName}
        />
      </Segment>
    )
  }
}
//Albumlist component for rendering a sorted list of album names
class AlbumList extends Component {
  albumItems () {
    return this.props.albums.map(album => 
      <List.Item key={album.id}>
        <NavLink to={`/albums/${album.id}`}>{album.name}</NavLink>
      </List.Item>
      );
  }

  render() {
    return (
      <Segment>
        <Header as="h3">My Albums</Header>
        <List divided relaxed>
          {this.albumItems()}
        </List>
      </Segment>
    );
  }
}

//AlbumListLoader component uses connect component from Amplify to provide data to AlbumList Component
class AlbumListLoader extends Component {
  //for handling onCreateAlbum sibscription
  onNewAlbum = (prevQuery, newData) => {
    //when we get data about a new album, we need to put it inot an object
    //with the same shape as the original query but with the new data added as well

    let updatedQuery = Object.assign({}, prevQuery);
    updatedQuery.listAlbums.items = prevQuery.listAlbums.items.concat([newData.onCreateAlbum])
    return updatedQuery;
  }
  render() {
    return (
      <Connect 
          query={graphqlOperation(ListAlbums)}
          subscription={graphqlOperation(SubscribeToNewAlbum)}
          onSubscriptionMsg={this.onNewAlbum}
      >
        {({data, loading, errors}) => {
          if(loading) {
            return <div>Loading...</div>
          }
          if(errors.length > 0) {
            return <div>{JSON.stringify(errors)}</div>
          }
          if(!data.listAlbums) {
            return;
          }
          return <AlbumList albums={data.listAlbums.items} />;
        }}
      </Connect>
    );
  }
}

//AlbumDetails component to display all the details extracted from a particular album

class AlbumDetails extends Component {
  render() {
    if(!this.props.album) return 'Loading Album...';
    return(
      <Segment>
        <Header as='h3'>{this.props.album.name}</Header>
        <ImageStorage albumId={this.props.album.id} />
        <PhotoList photos={this.props.album.photos.items}/>
        {
          this.props.hasMorePhotos &&
            <Form.Button
                onClick={this.props.loadMorePhotos}
                icon='refresh'
                disabled={this.props.loadingPhotos}
                content={this.props.loadingPhotos ? 'Loading...' : 'Load more'}
            />
        }
      </Segment>
    );
  }
}

//AlbumDetailsLoader component to get the details of a particular album
class AlbumDetailsLoader extends Component {
  
  //add state to handle load more photos, if some photos are not loaded
  constructor(props) {
    super(props);
    this.state = {
      nextTokenForPhotos: null,
      hasMorePhotos: true,
      album: null,
      loading: true
    }
  }

  async loadMorePhotos() {
    if (!this.state.hasMorePhotos) {
      return;
    }
    this.setState({loading: true});

    const {data} = await API.graphql(graphqlOperation(GetAlbum,
      {
        id: this.props.id,
        nextTokenForPhotos: this.state.nextTokenForPhotos
      }
    ));

    let album;
    if(this.state.album === null) {
      album = data.getAlbum;
    } else {
      album = this.state.album;
      album.photos.items = album.photos.items.concat(data.getAlbum.photos.items);
    }
    this.setState({
      album: album,
      loading: false,
      nextTokenForPhotos: data.getAlbum.photos.nextToken,
      hasMorePhotos: data.getAlbum.photos.nextToken !== null
    });
  
  }

  componentDidMount() {
    this.loadMorePhotos();
  }
  render() {
    return(
      <AlbumDetails 
          loadingPhotos={this.state.loading}
          album={this.state.album}
          loadMorePhotos={this.loadMorePhotos.bind(this)}
          hasMorePhotos={this.state.hasMorePhotos}
      />);
  }
}

//ImageStorage component for uploading photo to s3 bucket
class ImageStorage extends Component {
  //create a state for uploading
  constructor(props) {
    super(props);
    this.state = {uploading: false}
  }

  //async function to handle component while uploading
  onChange = async(event) => {
    const file = event.target.files[0];
    const fileName = uuid();

    this.setState({uploading: true});

    const result = await Storage.put(
      fileName,
      file,
      {
        customPrefix: {public: 'uploads/'},
        metadata: {albumid: this.props.albumId}
      }
    );
    console.log('Uploaded file:', result);
    this.setState({uploading: false});
  }

  render() {
    return(
      <div>
        <Form.Button
            onClick = {() => document.getElementById('add-image-file-input').click()}
            disabled = {this.state.uploading}
            icon = 'file image outline'
            content = { this.state.uploading ? 'Uploading...' : 'Add Image'}
        />
        <input 
            id = 'add-image-file-input'
            type= 'file'
            accept = "image/*"
            onChange = {this.onChange}
            style = {{display: 'none'}}
          />
      </div>
    );
  }
}
class ModalBox extends Component {
  render() {
    return(
      <Modal
        closeIcon
        onClose={this.props.closed}
        open={this.props.photo !== null}
      >
        <Modal.Header>{this.props.photo.thumbnail.key.replace('public/resized/', '')}</Modal.Header>
        <Modal.Content image>
              <S3Image
                key = {this.props.photo.thumbnail.key.replace('/resized', '')}
                imgKey={this.props.photo.thumbnail.key.replace('public/resized/', '')}
                theme={{photoImg: {maxWidth: '100%'}}}
              />
        </Modal.Content>
      </Modal>
    );
  }
}
//component to render all the thumbnails of the selected album
class PhotoList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedPhoto: null
    };
  }
  handleClick = (photo) => {
    this.setState({
      selectedPhoto: photo
    });
  }

  handleClose = () => {
    this.setState({
      selectedPhoto: null
    });
  }
  photoItems() {
    //console.log(this.props.photos)
    return this.props.photos.map(photo => 
        <S3Image
          key={photo.thumbnail.key}
          imgKey = {photo.thumbnail.key.replace('public/', '')}
          style={{display: 'inline-block', 'paddingRight': '5px'}}
          onClick={this.handleClick.bind(this, photo)}
        />
      );
  }
  showModalBox() {
    return this.state.selectedPhoto ? 
      <ModalBox 
        photo={this.state.selectedPhoto}
        closed={this.handleClose}/> : null;
  }
  render() {
    return(
      <div className="Aishwarya">
        <Divider hidden/>
        {this.photoItems()}
        {this.showModalBox()}
      </div>
    );
  }
}
//wrap the App component with AlbumListLoader
class App extends Component {
  render() {
    return (
      //Add router
      <BrowserRouter>
        <Grid padded>
          <Grid.Column>
            <Route path="/" exact component= {CreateNewAlbum} />
            <Route path="/" exact component= {AlbumListLoader}/>

            <Route path="/albums/:albumId" 
                   render={() => 
                      <div><NavLink to="/">Back</NavLink></div>
                  }
              />
            
            <Route path="/albums/:albumId"
                   render={props => 
                      <AlbumDetailsLoader id={props.match.params.albumId} />
                  }
              />
          </Grid.Column>
        </Grid>
      </BrowserRouter>
      
    );
  }
}

export default withAuthenticator(App, 
    {
      signUpConfig: 
      {
        hiddenDefaults: ["phone_number"]
      },
      usernameAttributes: "email",
      includeGreetings: true,
    });
