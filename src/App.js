import React, {Component}  from 'react';
import {Connect} from 'aws-amplify-react';
import {graphqlOperation} from 'aws-amplify';
import Amplify from 'aws-amplify';
import aws_exports from './aws-exports';
import { withAuthenticator } from 'aws-amplify-react';
import './App.css';
import { Grid, Header, List, Segment } from 'semantic-ui-react';
import '@aws-amplify/ui/dist/style.css';

Amplify.configure(aws_exports);

//Query all albums and store it in a string
const ListAlbums = `query ListAlbums {
  listAlbums(limit: 9999) {
    items {
      id
      name
    }
  }
}`;


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
  render() {
    return (
      <Connect query={graphqlOperation(ListAlbums)}>
        {({data, loading, errors}) => {
          if(loading) {
            return <div>Loading...</div>
          }
          console.log(data)
          if(!data.listAlbums) {
            console.log(errors)
            return;
          }
          return <AlbumList albums={data.listAlbums.items} />;
        }}
      </Connect>
    );
  }
}


//wrap the App component with AlbumListLoader
class App extends Component {
  render() {
    return (
      <Grid padded>
        <Grid.Column>
          <AlbumListLoader/>
        </Grid.Column>
      </Grid>
    );
  }
}

export default withAuthenticator(App, {includeGreetings: true});
