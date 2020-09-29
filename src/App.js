import React, {Component}  from 'react';
import {Connect} from 'aws-amplify-react';
import {graphqlOperation} from 'aws-amplify';
import Amplify from 'aws-amplify';
import aws_exports from './aws-exports';
import { withAuthenticator } from 'aws-amplify-react';
import './App.css';
import { Grid, Header, Input, List, Segment } from 'semantic-ui-react';
import '@aws-amplify/ui/dist/style.css';
Amplify.configure(aws_exports);

class App extends Component {
  render() {
    return (
      <div className="App">
        <Header as='h1'>Hello World!</Header>
      </div>
    );
  }
}

export default withAuthenticator(App, {includeGreetings: true});
