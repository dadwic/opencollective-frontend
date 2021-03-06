import React from 'react';
import { PropTypes } from 'prop-types';
import { graphql } from '@apollo/react-hoc';
import gql from 'graphql-tag';
import { pick } from 'lodash';
import { FormattedMessage } from 'react-intl';

import { checkUserExistence, signin } from '../lib/api';
import { getWebsiteUrl } from '../lib/utils';
import { Router } from '../server/pages';

import CreateProfileFAQ from './faqs/CreateProfileFAQ';
import CreateProfile from './CreateProfile';
import { Box, Flex } from './Grid';
import Link from './Link';
import MessageBox from './MessageBox';
import SignIn from './SignIn';
import { P } from './Text';

/**
 * Shows a SignIn form by default, with the ability to switch to SignUp form. It
 * also has the API methods binded, so you can use it directly.
 */
class SignInOrJoinFree extends React.Component {
  static propTypes = {
    /** Redirect URL */
    redirect: PropTypes.string,
    /** createUserQuery binding */
    createUser: PropTypes.func,
    /** Use this prop to use this as a controlled component */
    form: PropTypes.oneOf(['signin', 'create-account']),
    /** Set the initial view for the component */
    defaultForm: PropTypes.oneOf(['signin', 'create-account']),
    /** If provided, component will use links instead of buttons to make the switch */
    routes: PropTypes.shape({
      signin: PropTypes.string,
      join: PropTypes.string,
    }),
    /** A label to use instead of the default `Create personal profile` */
    createPersonalProfileLabel: PropTypes.node,
    /** A label to use instead of the default `Create Organization profile` */
    createOrganizationProfileLabel: PropTypes.node,
    /** To display a box shadow below the card */
    withShadow: PropTypes.bool,
    /** Label for signIn, defaults to "Sign in using your email address:" */
    signInLabel: PropTypes.node,
  };

  state = {
    form: this.props.defaultForm || 'signin',
    error: null,
    submitting: false,
    unknownEmailError: false,
    email: '',
  };

  switchForm = form => {
    // Update local state
    this.setState({ form });
  };

  getRedirectURL() {
    let currentPath = window.location.pathname;
    if (window.location.search) {
      currentPath = currentPath + window.location.search;
    }
    return encodeURIComponent(this.props.redirect || currentPath || '/');
  }

  signIn = async email => {
    if (this.state.submitting) {
      return false;
    }

    this.setState({ submitting: true });

    try {
      const userExists = await checkUserExistence(email);
      if (userExists) {
        const response = await signin({
          user: { email },
          redirect: this.getRedirectURL(),
          websiteUrl: getWebsiteUrl(),
        });

        // In dev/test, API directly returns a redirect URL for emails like
        // test*@opencollective.com.
        if (response.redirect) {
          await Router.replaceRoute(response.redirect);
        } else {
          await Router.pushRoute('signinLinkSent', { email });
        }
        window.scrollTo(0, 0);
      } else {
        this.setState({ unknownEmailError: true, submitting: false });
      }
    } catch (e) {
      this.setState({ error: e.message || 'Server error', submitting: false });
      window.scrollTo(0, 0);
    }
  };

  createProfile = async data => {
    if (this.state.submitting) {
      return false;
    }
    const user = pick(data, ['email', 'name', 'newsletterOptIn']);
    const organizationData = pick(data, ['orgName', 'githubHandle', 'twitterHandle', 'website']);
    const organization = Object.keys(organizationData).length > 0 ? organizationData : null;
    if (organization) {
      organization.name = organization.orgName;
      delete organization.orgName;
    }

    this.setState({ submitting: true });

    try {
      await this.props.createUser({
        variables: {
          user,
          organization,
          redirect: this.getRedirectURL(),
          websiteUrl: getWebsiteUrl(),
        },
      });
      await Router.pushRoute('signinLinkSent', { email: user.email });
      window.scrollTo(0, 0);
    } catch (error) {
      this.setState({ error: error.message, submitting: false });
      window.scrollTo(0, 0);
    }
  };

  render() {
    const { submitting, error, unknownEmailError, email } = this.state;
    const displayedForm = this.props.form || this.state.form;
    const routes = this.props.routes || {};

    return (
      <Flex flexDirection="column" width={1} alignItems="center">
        {error && (
          <MessageBox type="error" withIcon mb={[3, 4]}>
            {error.replace('GraphQL error: ', 'Error: ')}
          </MessageBox>
        )}
        {displayedForm !== 'create-account' ? (
          <SignIn
            email={email}
            onEmailChange={email => this.setState({ email })}
            onSecondaryAction={routes.join || (() => this.switchForm('create-account'))}
            onSubmit={this.signIn}
            loading={submitting}
            unknownEmail={unknownEmailError}
            withShadow={this.props.withShadow}
            label={this.props.signInLabel}
          />
        ) : (
          <Flex flexDirection="column" width={1} alignItems="center">
            <Flex justifyContent="center" width={1}>
              <Box width={[0, null, null, 1 / 5]} />
              <CreateProfile
                email={email}
                onEmailChange={email => this.setState({ email })}
                onPersonalSubmit={this.createProfile}
                onOrgSubmit={this.createProfile}
                onSecondaryAction={routes.signin || (() => this.switchForm('signin'))}
                submitting={submitting}
                mx={[2, 4]}
                createPersonalProfileLabel={this.props.createPersonalProfileLabel}
                createOrganizationProfileLabel={this.props.createOrganizationProfileLabel}
              />
              <CreateProfileFAQ mt={4} display={['none', null, 'block']} width={1 / 5} minWidth="335px" />
            </Flex>
            <P mt={4} color="black.500" fontSize="Caption" mb={3} data-cy="join-conditions">
              <FormattedMessage
                id="SignIn.legal"
                defaultMessage="By joining, you agree to our <tos-link>Terms of Service</tos-link> and <privacy-policy-link>Privacy Policy</privacy-policy-link>."
                values={{
                  'tos-link': msg => <Link route="/tos">{msg}</Link>,
                  'privacy-policy-link': msg => <Link route="/privacypolicy">{msg}</Link>,
                }}
              />
            </P>
          </Flex>
        )}
      </Flex>
    );
  }
}

const createUserQuery = gql`
  mutation createUser(
    $user: UserInputType!
    $organization: CollectiveInputType
    $redirect: String
    $websiteUrl: String
  ) {
    createUser(user: $user, organization: $organization, redirect: $redirect, websiteUrl: $websiteUrl) {
      user {
        id
        email
        name
      }
      organization {
        id
        slug
      }
    }
  }
`;

const addCreateUserMutation = graphql(createUserQuery, { name: 'createUser' });

export default addCreateUserMutation(SignInOrJoinFree);
