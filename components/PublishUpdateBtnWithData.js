import React from 'react';
import PropTypes from 'prop-types';
import { graphql } from '@apollo/react-hoc';
import gql from 'graphql-tag';
import { get } from 'lodash';
import { FormattedMessage } from 'react-intl';

import { compose } from '../lib/utils';

import SmallButton from './SmallButton';

class PublishUpdateBtn extends React.Component {
  static propTypes = {
    id: PropTypes.number.isRequired,
    publishUpdate: PropTypes.func,
    data: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  async onClick() {
    const { id } = this.props;
    await this.props.publishUpdate(id);
  }

  render() {
    const update = this.props.data.Update;

    return (
      <div data-cy="PublishUpdateBtn" className="PublishUpdateBtn">
        <style jsx>
          {`
            .PublishUpdateBtn {
              display: flex;
              align-items: center;
            }
            .notice {
              color: #525866;
              font-size: 12px;
              margin-left: 1rem;
            }
          `}
        </style>
        <SmallButton className="publish" onClick={this.onClick}>
          <FormattedMessage id="update.publish.btn" defaultMessage="publish" />
        </SmallButton>
        <div className="notice">
          <FormattedMessage
            id="update.publish.backers"
            defaultMessage={'Your update will be sent to {n} backers'}
            values={{ n: get(update, 'collective.stats.backers.all') }}
          />
        </div>
      </div>
    );
  }
}

const publishUpdateMutation = gql`
  mutation PublishUpdate($id: Int!) {
    publishUpdate(id: $id) {
      id
      publishedAt
    }
  }
`;

const updateQuery = gql`
  query Update($id: Int!) {
    Update(id: $id) {
      id
      collective {
        id
        stats {
          id
          backers {
            all
          }
        }
      }
    }
  }
`;

const addUpdateData = graphql(updateQuery);

const addPublishUpdateMutation = graphql(publishUpdateMutation, {
  props: ({ mutate }) => ({
    publishUpdate: async id => {
      return await mutate({ variables: { id } });
    },
  }),
});

const addGraphql = compose(addPublishUpdateMutation, addUpdateData);

export default addGraphql(PublishUpdateBtn);
