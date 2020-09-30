import React, {Component}  from 'react';
import {Connect} from 'aws-amplify-react';
import {API, graphqlOperation} from 'aws-amplify';
import Amplify from 'aws-amplify';
import aws_exports from './aws-exports';
import { withAuthenticator } from 'aws-amplify-react';
import './App.css';
import { Grid, Header, Input, List, Segment } from 'semantic-ui-react';
import '@aws-amplify/ui/dist/style.css';

import {BrowserRouter, Route, NavLink} from 'react-router-dom';

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
const GetAlbum = `query GetAlbum($id: ID!) {
  getAlbum(id: $id) {
    id
    name
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
      <li key={album.id}>
        {album.name}
      </li>
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
    return(
      <Segment>
        <Header as='h3'>{this.props.album.name}</Header>
        <p>Todo: allow photo uploads</p>
        <p>Todo: display pictures of this album</p>
      </Segment>
    );
  }
}

//AlbumDetailsLoader component to get the details of a particular album
class AlbumDetailsLoader extends Component {
  render() {
    return(
      <Connect
        query={graphqlOperation(GetAlbum, {
          id: this.props.id
        })}>
          {({data, loading, errors}) => {
            if(loading) {
              return <div>Loading...</div>
            }
            if(errors.length > 0) {
              return <div>{JSON.stringify(errors)}</div>
            }
            if(!data.getAlbum) {
              return
            }
            return <AlbumDetails album={data.getAlbum} />;
          }}
      </Connect>
    );
  }
}

//wrap the App component with AlbumListLoader
class App extends Component {
  render() {
    return (
      //Add router
      <Router>
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
      </Router>
      
    );
  }
}

export default withAuthenticator(App, {includeGreetings: true});
